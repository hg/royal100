import { random, shuffle } from "./random";
import { isEven, isOdd, range, remove } from "./util";

const min = 0;
const max = 9;

function side960(): string {
  while (true) {
    const cells: string[] = [];
    const odd = range(min, max).filter(isOdd);
    const even = range(min, max).filter(isEven);

    const rm = (index: number) => {
      remove(odd, index);
      remove(even, index);
    };

    // Короля располагаем так, чтобы слева и справа от него обязательно
    // осталась хотя бы одна ячейка — он должен оказаться между ладьями.
    const king = random(min + 1, max - 1);
    cells[king] = "k";
    rm(king);

    // Ладьи по обеим сторонам от короля
    const leftRook = random(min, king - 1);
    cells[leftRook] = "r";
    rm(leftRook);

    const rightRook = random(king + 1, max);
    cells[rightRook] = "r";
    rm(rightRook);

    // Добавляем слонов в две любые свободные ячейки таким образом, чтобы
    // они оказались на разных цветах (чётный и нечётный столбец).
    cells[even.shift()!] = "b";
    cells[odd.shift()!] = "b";

    // Принцесса и ферзь должны оказаться на своём цвете — для обеих
    // сторон это только нечётные столбцы.
    if (odd.length < 2) {
      // Не хватило клеток своего цвета — придётся пробовать опять
      continue;
    }
    cells[odd.shift()!] = "s";
    cells[odd.shift()!] = "q";

    const free = shuffle([...odd, ...even]);

    // Раскидываем оставшиеся фигуры
    cells[free.shift()!] = "n";
    cells[free.shift()!] = "t";
    cells[free.shift()!] = "n";

    return cells.join("");
  }
}

export function generate960(): string {
  const black = side960();
  const white = side960().toUpperCase();
  return `${black}/pppppppppp/55/55/55/55/55/55/PPPPPPPPPP/${white} w KQkq Ss - 0 1`;
}
