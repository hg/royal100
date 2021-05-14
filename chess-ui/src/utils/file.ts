import moment from "moment";

export function saveFile(data: BlobPart) {
  const name = moment().format("YYYY-MM-DD_HH-mm-ss");
  const blob = new Blob([data]);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${name}.royal100`;
  link.click();
  link.remove();
}
