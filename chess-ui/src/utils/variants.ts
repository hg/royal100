import { random } from "./random";
import { isEven, isOdd, pluck, range, remove } from "./util";
import { Predicate } from "../types";

const min = 0;
const max = 9;

function side960(): string {
  while (true) {
    const cells: string[] = [];

    // Короля располагаем так, чтобы слева и справа от него обязательно
    // осталась хотя бы одна ячейка — он должен оказаться между ладьями.
    const king = random(min + 1, max - 1);
    cells[king] = "k";

    // Ладьи по обеим сторонам от короля
    const leftRook = random(min, king - 1);
    cells[leftRook] = "r";

    const rightRook = random(king + 1, max);
    cells[rightRook] = "r";

    const remaining = (filter: Predicate<number>) => {
      const values = range(min, max).filter(filter);
      return remove(values, king, leftRook, rightRook);
    };

    const odd = remaining(isOdd);
    const even = remaining(isEven);

    // Добавляем слонов в две любые свободные ячейки таким образом, чтобы
    // они оказались на разных цветах (чётный и нечётный столбец).
    cells[pluck(even)!] = "b";
    cells[pluck(odd)!] = "b";

    // Принцесса и ферзь должны оказаться на своём цвете — для обеих
    // сторон это только нечётные столбцы.
    if (odd.length < 2) {
      // Не хватило клеток своего цвета — придётся пробовать опять
      continue;
    }
    cells[pluck(odd)!] = "s";
    cells[pluck(odd)!] = "q";

    // Раскидываем оставшиеся фигуры
    cells[pluck(odd, even)!] = "n";
    cells[pluck(odd, even)!] = "t";
    cells[pluck(odd, even)!] = "n";

    return cells.join("");
  }
}

export function generate960(): string {
  const black = side960();
  const white = side960().toUpperCase();
  return `${black}/pppppppppp/55/55/55/55/55/55/PPPPPPPPPP/${white} w KQkq Ss - 0 1`;
}
