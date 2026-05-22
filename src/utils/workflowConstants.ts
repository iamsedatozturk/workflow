import { FiBell, FiCheck, FiGitBranch, FiPlay, FiSlash } from "react-icons/fi";

export const kindOptions = [
  { value: "Start", label: "Başlat" },
  { value: "Compare", label: "Karşılaştırma" },
  { value: "Approval", label: "Onaylanacak kişi" },
  { value: "Inform", label: "Bilgilendirme" },
  { value: "End", label: "Akışı bitir" },
];

export const operatorOptions = [">", ">=", "<", "<=", "=", "!="].map(
  (value) => ({
    value,
    label: value,
  }),
);

export const columnOptions = ["Tutar", "Id"].map((value) => ({
  value,
  label: value,
}));

export const kindIcon = {
  Start: FiPlay as any,
  Compare: FiGitBranch as any,
  Approval: FiCheck as any,
  Inform: FiBell as any,
  End: FiSlash as any,
};

export const nodeSize = {
  width: 176,
  height: 128,
};

export function getNodeHeight(item) {
  return item?.kind === "Compare" ? 158 : nodeSize.height;
}
