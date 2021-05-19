import styles from "./index.module.css";

export function cloneAddressRows(element: HTMLElement) {
  const cg = element.querySelector("cg-container");
  const ranks = cg?.querySelector("coords.ranks")?.cloneNode(true) as Element;
  const files = cg?.querySelector("coords.files")?.cloneNode(true) as Element;

  if (cg && ranks && files) {
    ranks.classList.add(styles.ranks);
    files.classList.add(styles.files);
    cg.append(ranks, files);
  }
}
