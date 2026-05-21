using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddSingleton<WorkflowStore>();

var app = builder.Build();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/state", async (WorkflowStore store) => await store.LoadAsync());

app.MapPost("/api/workflows", async (WorkflowStore store, CreateWorkflowRequest request) =>
{
    var state = await store.LoadAsync();
    var item = new WorkflowItem
    {
        Id = state.NextWorkflowId++,
        Sorumlu = request.Sorumlu.Trim(),
        Tarih = DateOnly.FromDateTime(DateTime.Today),
        Durum = "İş Akışı Başlat",
        Amount = request.Amount,
        CurrentNodeId = $"W{state.NextWorkflowId - 1}-C1",
        History = [new WorkflowHistory("Oluşturuldu", "İş akışı kaydı oluşturuldu.")]
    };

    state.WorkflowItems.Add(item);
    await store.SaveAsync(state);
    return Results.Created($"/api/workflows/{item.Id}", item);
});

app.MapPut("/api/workflows/{id:int}", async (WorkflowStore store, int id, UpdateWorkflowRequest request) =>
{
    var state = await store.LoadAsync();
    var item = state.WorkflowItems.FirstOrDefault(w => w.Id == id);
    if (item is null) return Results.NotFound();

    item.Sorumlu = request.Sorumlu.Trim();
    item.Tarih = request.Tarih;
    item.Amount = request.Amount;
    item.History.Add(new WorkflowHistory("Güncellendi", "Workflow tablo bilgileri güncellendi."));

    await store.SaveAsync(state);
    return Results.Ok(item);
});

app.MapPost("/api/workflows/{id:int}/start", async (WorkflowStore store, int id) =>
{
    var state = await store.LoadAsync();
    var item = state.WorkflowItems.FirstOrDefault(w => w.Id == id);
    if (item is null) return Results.NotFound();

    item.History.Add(new WorkflowHistory("Başlatıldı", "Akış başlatma butonu çalıştırıldı."));
    WorkflowEngine.Advance(state, item, "start");
    await store.SaveAsync(state);
    return Results.Ok(item);
});

app.MapPost("/api/workflows/{id:int}/decision", async (WorkflowStore store, int id, DecisionRequest request) =>
{
    var state = await store.LoadAsync();
    var item = state.WorkflowItems.FirstOrDefault(w => w.Id == id);
    if (item is null) return Results.NotFound();

    var action = request.Approved ? "approved" : "rejected";
    item.History.Add(new WorkflowHistory(request.Approved ? "Onaylandı" : "Reddedildi", request.Note));
    WorkflowEngine.Advance(state, item, action);
    await store.SaveAsync(state);
    return Results.Ok(item);
});

app.MapPost("/api/criteria", async (WorkflowStore store, UpsertCriteriaRequest request) =>
{
    var validationErrors = CriteriaValidation.Validate(request);
    if (validationErrors.Count > 0) return Results.BadRequest(new { errors = validationErrors });

    var state = await store.LoadAsync();
    var existing = state.Criteria.FirstOrDefault(c => c.Id == request.Id);
    var record = existing ?? new CriteriaRecord
    {
        Id = WorkflowState.NextCriteriaIdFor(state.Criteria, request.WorkflowItemId)
    };

    record.WorkflowItemId = request.WorkflowItemId;
    record.Title = request.Title.Trim();
    record.Kind = request.Kind;
    record.Column = request.Column.Trim();
    record.Operator = request.Operator.Trim();
    record.CompareValue = request.CompareValue;
    var sharedPerson = !string.IsNullOrWhiteSpace(request.Approver) ? request.Approver.Trim() : request.InformPerson.Trim();
    record.Approver = sharedPerson;
    record.InformPerson = sharedPerson;
    record.NextOnStart = request.NextOnStart;
    record.NextOnTrue = request.NextOnTrue;
    record.NextOnFalse = request.NextOnFalse;
    record.NextOnApprove = request.NextOnApprove;
    record.NextOnReject = request.NextOnReject;
    record.CompareOutcomes = request.CompareOutcomes ?? [];
    record.PositionX = request.PositionX;
    record.PositionY = request.PositionY;

    if (existing is null) state.Criteria.Add(record);
    await store.SaveAsync(state);
    return Results.Ok(record);
});

app.MapDelete("/api/criteria/{id}", async (WorkflowStore store, string id) =>
{
    var state = await store.LoadAsync();
    state.Criteria.RemoveAll(c => c.Id == id);
    foreach (var criteria in state.Criteria)
    {
        criteria.ClearTarget(id);
    }
    await store.SaveAsync(state);
    return Results.NoContent();
});

app.MapPost("/api/reset-demo", async (WorkflowStore store) =>
{
    var state = WorkflowState.Seeded();
    await store.SaveAsync(state);
    return Results.Ok(state);
});

app.Run();

public sealed class WorkflowStore
{
    private readonly string _filePath = Path.Combine(AppContext.BaseDirectory, "data", "workflow-db.json");
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() }
    };

    public async Task<WorkflowState> LoadAsync()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
        if (!File.Exists(_filePath))
        {
            var seeded = WorkflowState.Seeded();
            await SaveAsync(seeded);
            return seeded;
        }

        WorkflowState state;
        await using (var stream = File.OpenRead(_filePath))
        {
            state = await JsonSerializer.DeserializeAsync<WorkflowState>(stream, _jsonOptions) ?? WorkflowState.Seeded();
        }

        if (WorkflowState.RepairDuplicateCriteriaIds(state) || WorkflowState.TrimSeededExtraWorkflows(state))
        {
            await SaveAsync(state);
        }

        return state;
    }

    public async Task SaveAsync(WorkflowState state)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
        await using var stream = File.Create(_filePath);
        await JsonSerializer.SerializeAsync(stream, state, _jsonOptions);
    }
}

public static class WorkflowEngine
{
    public static void Advance(WorkflowState state, WorkflowItem item, string action)
    {
        var scopedCriteria = state.Criteria.Where(c => c.WorkflowItemId == item.Id).ToList();
        var current = scopedCriteria.FirstOrDefault(c => c.Id == item.CurrentNodeId)
            ?? scopedCriteria.FirstOrDefault(c => c.Kind == CriteriaKind.Start);

        if (current is null)
        {
            item.Durum = "Akış Tanımsız";
            return;
        }

        var nextId = ResolveNextId(current, item, action);
        var guard = 0;
        while (!string.IsNullOrWhiteSpace(nextId) && guard++ < 20)
        {
            var next = scopedCriteria.FirstOrDefault(c => c.Id == nextId);
            if (next is null)
            {
                item.Durum = "Eksik Bağlantı";
                item.CurrentNodeId = nextId;
                return;
            }

            item.CurrentNodeId = next.Id;
            item.Durum = next.Title;
            switch (next.Kind)
            {
                case CriteriaKind.Compare:
                    if (action == "start" && current.Kind == CriteriaKind.Start)
                    {
                        item.History.Add(new WorkflowHistory("Karşılaştırma", $"{next.Title} adımına geçildi."));
                    }

                    var passed = Evaluate(item, next);
                    item.History.Add(new WorkflowHistory("Karşılaştırma", $"{next.Title}: {(passed ? "sağlandı" : "sağlanmadı")}"));
                    nextId = ResolveCompareNext(next, item, passed);
                    break;
                case CriteriaKind.Approval:
                    item.Durum = next.Title;
                    item.AssignedApprover = next.Approver;
                    item.History.Add(new WorkflowHistory("Onay Bekliyor", $"{next.Approver} onayına gönderildi."));
                    return;
                case CriteriaKind.Inform:
                    item.Durum = next.Title;
                    var informedPerson = !string.IsNullOrWhiteSpace(next.Approver) ? next.Approver : next.InformPerson;
                    item.InformedPerson = informedPerson;
                    item.History.Add(new WorkflowHistory("Bilgilendirme", $"{informedPerson} bilgilendirildi."));
                    nextId = next.NextOnStart;
                    break;
                case CriteriaKind.End:
                    item.Durum = next.Title;
                    item.CurrentNodeId = next.Id;
                    item.History.Add(new WorkflowHistory("Akış Bitti", "Akışı bitir adımı çalıştı."));
                    return;
                case CriteriaKind.Start:
                default:
                    nextId = next.NextOnStart;
                    break;
            }
        }
    }

    private static string? ResolveNextId(CriteriaRecord current, WorkflowItem item, string action) =>
        action switch
        {
            "approved" => current.NextOnApprove,
            "rejected" => current.NextOnReject,
            "start" when current.Kind == CriteriaKind.Start => current.NextOnStart,
            "start" => current.Id,
            _ => current.NextOnStart
        };

    private static bool Evaluate(WorkflowItem item, CriteriaRecord criteria)
    {
        var value = criteria.Column.Equals("Tutar", StringComparison.OrdinalIgnoreCase) ? item.Amount : item.Id;
        return criteria.Operator switch
        {
            ">" => value > criteria.CompareValue,
            ">=" => value >= criteria.CompareValue,
            "<" => value < criteria.CompareValue,
            "<=" => value <= criteria.CompareValue,
            "=" => value == criteria.CompareValue,
            "!=" => value != criteria.CompareValue,
            _ => false
        };
    }

    private static string? ResolveCompareNext(CriteriaRecord criteria, WorkflowItem item, bool passed)
    {
        if (criteria.CompareOutcomes.Count > 0)
        {
            var matchedOutcome = criteria.CompareOutcomes.FirstOrDefault(outcome => OutcomeMatches(outcome, item));
            if (matchedOutcome is not null) return matchedOutcome.TargetId;

            var fallbackIndex = passed ? 0 : Math.Min(1, criteria.CompareOutcomes.Count - 1);
            return criteria.CompareOutcomes[fallbackIndex].TargetId;
        }

        return passed ? criteria.NextOnTrue : criteria.NextOnFalse;
    }

    private static bool OutcomeMatches(CompareOutcome outcome, WorkflowItem item)
    {
        if (outcome.Conditions.Count == 0 && outcome.CompareValue == 0) return false;

        var conditions = outcome.Conditions.Count > 0
            ? outcome.Conditions
            : [new CompareCondition(outcome.Column, outcome.Operator, outcome.CompareValue)];

        return conditions.Count > 0 && conditions.All(condition => EvaluateCondition(item, condition));
    }

    private static bool EvaluateCondition(WorkflowItem item, CompareCondition condition)
    {
        var value = condition.Column.Equals("Tutar", StringComparison.OrdinalIgnoreCase)
            ? item.Amount
            : item.Id;

        return condition.Operator switch
        {
            ">" => value > condition.CompareValue,
            ">=" => value >= condition.CompareValue,
            "<" => value < condition.CompareValue,
            "<=" => value <= condition.CompareValue,
            "=" => value == condition.CompareValue,
            "!=" => value != condition.CompareValue,
            _ => false
        };
    }
}

public sealed class WorkflowState
{
    public int NextWorkflowId { get; set; } = 1;
    public int NextCriteriaId { get; set; } = 1;
    public List<WorkflowItem> WorkflowItems { get; set; } = [];
    public List<CriteriaRecord> Criteria { get; set; } = [];

    public static WorkflowState Seeded() => new()
    {
        NextWorkflowId = 3,
        NextCriteriaId = 8,
        WorkflowItems =
        [
            new WorkflowItem
            {
                Id = 1,
                Sorumlu = "Üretim Süreci",
                Tarih = DateOnly.FromDateTime(DateTime.Today),
                Durum = "İş Akışı Başlat",
                Amount = 7200,
                CurrentNodeId = "W1-C1",
                History = [new WorkflowHistory("Oluşturuldu", "Standart tutar satın alma talebi oluşturuldu.")]
            },
            new WorkflowItem
            {
                Id = 2,
                Sorumlu = "Satınalma Süreci",
                Tarih = DateOnly.FromDateTime(DateTime.Today.AddDays(-1)),
                Durum = "İş Akışı Başlat",
                Amount = 18400,
                CurrentNodeId = "W2-C1",
                History = [new WorkflowHistory("Oluşturuldu", "Yüksek tutar yazılım lisansı talebi oluşturuldu.")]
            }
        ],
        Criteria =
        [
            ..BuildDefaultCriteria(1),
            ..BuildDefaultCriteria(2)
        ]
    };

    public static List<CriteriaRecord> BuildDefaultCriteria(int workflowItemId)
    {
        string Id(int number) => $"W{workflowItemId}-C{number}";

        return
        [
            new CriteriaRecord { WorkflowItemId = workflowItemId, Id = Id(1), Kind = CriteriaKind.Start, Title = "İş Akışı Başlat", NextOnStart = Id(2), PositionX = 40, PositionY = 190 },
            new CriteriaRecord
            {
                WorkflowItemId = workflowItemId,
                Id = Id(2),
                Kind = CriteriaKind.Compare,
                Title = "Tutar durumunu değerlendir",
                Column = "Tutar",
                Operator = ">",
                CompareValue = 5000,
                NextOnTrue = Id(3),
                NextOnFalse = Id(4),
                PositionX = 330,
                PositionY = 190,
                CompareOutcomes =
                [
                    new CompareOutcome("Standart", Id(3)) { Conditions = [new CompareCondition("Tutar", ">", 5000), new CompareCondition("Tutar", "<", 10000)] },
                    new CompareOutcome("Düşük Tutar", Id(6)) { Conditions = [new CompareCondition("Tutar", "<", 5000)] },
                    new CompareOutcome("Yüksek Tutar", Id(4)) { Conditions = [new CompareCondition("Tutar", ">=", 10000)] }
                ]
            },
            new CriteriaRecord { WorkflowItemId = workflowItemId, Id = Id(3), Kind = CriteriaKind.Approval, Title = "Ekip Lideri Onayı", Approver = "Burak Şahin", NextOnApprove = Id(4), NextOnReject = Id(6), PositionX = 650, PositionY = 90 },
            new CriteriaRecord { WorkflowItemId = workflowItemId, Id = Id(4), Kind = CriteriaKind.Approval, Title = "Departman Müdürü Onayı", Approver = "Selin Koç", NextOnApprove = Id(5), NextOnReject = Id(6), PositionX = 960, PositionY = 190 },
            new CriteriaRecord { WorkflowItemId = workflowItemId, Id = Id(5), Kind = CriteriaKind.Approval, Title = "Finans Onayı", Approver = "Mehmet Yılmaz", NextOnApprove = Id(6), NextOnReject = Id(6), PositionX = 1270, PositionY = 90 },
            new CriteriaRecord { WorkflowItemId = workflowItemId, Id = Id(6), Kind = CriteriaKind.Inform, Title = "İlgili Birimleri Bilgilendir", InformPerson = "Satın Alma ve Muhasebe", NextOnStart = Id(7), PositionX = 1580, PositionY = 190 },
            new CriteriaRecord { WorkflowItemId = workflowItemId, Id = Id(7), Kind = CriteriaKind.End, Title = "Akışı Bitir", PositionX = 1890, PositionY = 190 }
        ];
    }

    public static string NextCriteriaIdFor(IEnumerable<CriteriaRecord> criteria, int workflowItemId)
    {
        var prefix = $"W{workflowItemId}-C";
        var nextNumber = criteria
            .Where(item => item.WorkflowItemId == workflowItemId && item.Id.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            .Select(item => int.TryParse(item.Id[prefix.Length..], out var number) ? number : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;

        return $"{prefix}{nextNumber}";
    }

    public static bool RepairDuplicateCriteriaIds(WorkflowState state)
    {
        var changed = false;
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var criteria in state.Criteria)
        {
            if (!string.IsNullOrWhiteSpace(criteria.Id) && seen.Add(criteria.Id)) continue;

            criteria.Id = NextCriteriaIdFor(state.Criteria, criteria.WorkflowItemId);
            seen.Add(criteria.Id);
            changed = true;
        }

        return changed;
    }

    public static bool TrimSeededExtraWorkflows(WorkflowState state)
    {
        var seededExtraIds = new HashSet<int> { 3, 4, 5 };
        var seededExtraNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Elif Arslan",
            "Mert Kaya",
            "Zeynep Çelik",
            "Ayşe Demir",
            "Can Ersoy"
        };
        var removableIds = state.WorkflowItems
            .Where(item => seededExtraIds.Contains(item.Id) && seededExtraNames.Contains(item.Sorumlu))
            .Select(item => item.Id)
            .ToHashSet();

        if (removableIds.Count == 0) return false;

        state.WorkflowItems.RemoveAll(item => removableIds.Contains(item.Id));
        state.Criteria.RemoveAll(criteria => removableIds.Contains(criteria.WorkflowItemId));
        state.NextWorkflowId = Math.Max(state.NextWorkflowId, state.WorkflowItems.Select(item => item.Id).DefaultIfEmpty(0).Max() + 1);
        return true;
    }
}

public sealed class WorkflowItem
{
    public int Id { get; set; }
    public string Sorumlu { get; set; } = "";
    public DateOnly Tarih { get; set; }
    public string Durum { get; set; } = "Taslak";
    public decimal Amount { get; set; }
    public string? CurrentNodeId { get; set; }
    public string AssignedApprover { get; set; } = "";
    public string InformedPerson { get; set; } = "";
    public List<WorkflowHistory> History { get; set; } = [];
}

public sealed record WorkflowHistory(string Action, string Note)
{
    public DateTime Time { get; init; } = DateTime.Now;
}

public static class CriteriaValidation
{
    public static List<string> Validate(UpsertCriteriaRequest request)
    {
        var errors = new List<string>();
        var sharedPerson = FirstText(request.Approver, request.InformPerson);

        Require(errors, request.Title, "Başlık zorunludur.");

        switch (request.Kind)
        {
            case CriteriaKind.Start:
                Require(errors, request.NextOnStart, "Başlat adımı için Sonraki adım zorunludur.");
                break;
            case CriteriaKind.Compare:
                ValidateCompareOutcomes(errors, request);
                break;
            case CriteriaKind.Approval:
                Require(errors, sharedPerson, "Onaylanacak kişi adımı için Onaylayacak Kişi zorunludur.");
                Require(errors, request.NextOnApprove, "Onaylanacak kişi adımı için Onay adımı zorunludur.");
                Require(errors, request.NextOnReject, "Onaylanacak kişi adımı için Red adımı zorunludur.");
                break;
            case CriteriaKind.Inform:
                Require(errors, sharedPerson, "Bilgilendirme adımı için Onaylayacak Kişi zorunludur.");
                Require(errors, request.NextOnStart, "Bilgilendirme adımı için Sonraki adım zorunludur.");
                break;
            case CriteriaKind.End:
                break;
        }

        return errors;
    }

    private static void ValidateCompareOutcomes(List<string> errors, UpsertCriteriaRequest request)
    {
        var outcomes = request.CompareOutcomes ?? [];
        if (outcomes.Count == 0)
        {
            errors.Add("Karşılaştırma adımı için en az bir durum zorunludur.");
            return;
        }

        for (var index = 0; index < outcomes.Count; index++)
        {
            var outcome = outcomes[index];
            var label = string.IsNullOrWhiteSpace(outcome.Label) ? $"Durum {index + 1}" : outcome.Label;

            Require(errors, outcome.Label, $"{label} için durum adı zorunludur.");
            Require(errors, outcome.TargetId, $"{label} için hedef adım zorunludur.");

            if (outcome.Conditions.Count == 0)
            {
                errors.Add($"{label} için en az bir koşul zorunludur.");
            }

            foreach (var condition in outcome.Conditions)
            {
                Require(errors, condition.Column, $"{label} için koşul sütunu zorunludur.");
                Require(errors, condition.Operator, $"{label} için koşul operatörü zorunludur.");
            }
        }
    }

    private static string FirstText(params string?[] values) =>
        values.Select(value => value?.Trim()).FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? "";

    private static void Require(List<string> errors, string? value, string message)
    {
        if (string.IsNullOrWhiteSpace(value)) errors.Add(message);
    }
}

public sealed class CriteriaRecord
{
    public int WorkflowItemId { get; set; }
    public string Id { get; set; } = "";
    public CriteriaKind Kind { get; set; }
    public string Title { get; set; } = "";
    public string Column { get; set; } = "Tutar";
    public string Operator { get; set; } = ">";
    public decimal CompareValue { get; set; }
    public string Approver { get; set; } = "";
    public string InformPerson { get; set; } = "";
    public string? NextOnStart { get; set; }
    public string? NextOnTrue { get; set; }
    public string? NextOnFalse { get; set; }
    public string? NextOnApprove { get; set; }
    public string? NextOnReject { get; set; }
    public List<CompareOutcome> CompareOutcomes { get; set; } = [];
    public int PositionX { get; set; }
    public int PositionY { get; set; }

    public void ClearTarget(string id)
    {
        if (NextOnStart == id) NextOnStart = null;
        if (NextOnTrue == id) NextOnTrue = null;
        if (NextOnFalse == id) NextOnFalse = null;
        if (NextOnApprove == id) NextOnApprove = null;
        if (NextOnReject == id) NextOnReject = null;
        foreach (var outcome in CompareOutcomes.Where(o => o.TargetId == id))
        {
            outcome.TargetId = null;
        }
    }
}

public sealed record CompareCondition(string Column, string Operator, decimal CompareValue);

public sealed record CompareOutcome(string Label, string? TargetId)
{
    public string Label { get; set; } = Label;
    public string? TargetId { get; set; } = TargetId;
    public List<CompareCondition> Conditions { get; set; } = [];
    public string Column { get; set; } = "Tutar";
    public string Operator { get; set; } = ">";
    public decimal CompareValue { get; set; }
}

public enum CriteriaKind
{
    Start,
    Compare,
    Approval,
    Inform,
    End
}

public sealed record CreateWorkflowRequest(string Sorumlu, decimal Amount);
public sealed record UpdateWorkflowRequest(string Sorumlu, DateOnly Tarih, decimal Amount);
public sealed record DecisionRequest(bool Approved, string Note);
public sealed record UpsertCriteriaRequest(
    string? Id,
    int WorkflowItemId,
    CriteriaKind Kind,
    string Title,
    string Column,
    string Operator,
    decimal CompareValue,
    string Approver,
    string InformPerson,
    string? NextOnStart,
    string? NextOnTrue,
    string? NextOnFalse,
    string? NextOnApprove,
    string? NextOnReject,
    List<CompareOutcome>? CompareOutcomes,
    int PositionX,
    int PositionY);
