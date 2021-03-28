export function enginePositionToBoard(position: string): string {
  return position.replace("10", ":");
}

export function boardFenToEngine(fen: string): string {
  // Движок распознаёт '10' не как «десять», а как '1' и '0'
  const engineFen = fen.replaceAll("10", "55");

  // Единица зачем-то требуется в конце каждой строки, причину пока не искал
  return engineFen + "1";
}
