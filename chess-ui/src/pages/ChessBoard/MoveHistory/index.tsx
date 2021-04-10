import { observer } from "mobx-react-lite";
import styles from "./index.module.css";
import {
  AiOutlineArrowDown,
  BsArrowUpRight,
  FaChessKnight,
  HiOutlineRefresh,
} from "react-icons/all";
import React, { FC, Fragment } from "react";
import { Move } from "../../../game/game";
import { Button, notification } from "antd";
import { clipboard } from "electron";

interface Props {
  moves: Move[];
  canMove: (moveNumber: number) => boolean;
  setMove: (moveNumber: number) => void;
}

function copyFen(num: number, fen: string) {
  notification.success({
    message: `Нотация хода №${num} скопирована в буфер обмена`,
  });
  clipboard.writeText(fen);
}

const TableHeader = () => (
  <thead>
    <tr>
      <th>№</th>
      <th title="Фигура">
        <FaChessKnight />
      </th>
      <th title="Из позиции">
        <BsArrowUpRight />
      </th>
      <th title="В позицию">
        <AiOutlineArrowDown />
      </th>
      <th title="Взятие">
        <HiOutlineRefresh />
      </th>
    </tr>
  </thead>
);

interface RowProps {
  move: Move;
  num: number;
  setMove?: (moveNumber: number) => void;
}

const TableRow: FC<RowProps> = ({ move, num, setMove }) => (
  <tr
    title="Скопировать позицию в нотации FEN"
    role="button"
    onClick={() => copyFen(num, move.fenAfter)}
  >
    <td>
      {setMove ? (
        <Button
          size="small"
          type="primary"
          title="Вернуться к ходу"
          onClick={(e) => {
            e.stopPropagation();
            setMove(num);
          }}
        >
          {num + 1}
        </Button>
      ) : (
        num + 1
      )}
    </td>
    <td>
      <div
        className={`${move.piece?.role} ${move.color} ${styles.piece} ${styles.movePiece}`}
      />
    </td>
    <td>{move.from}</td>
    <td>{move.to}</td>
    <td>
      {move.captured ? (
        <div
          className={`${move.captured.role} ${move.captured.color} ${styles.piece}`}
        />
      ) : (
        "—"
      )}
    </td>
  </tr>
);

export const MoveHistory = observer<Props>(({ moves, canMove, setMove }) => (
  <Fragment>
    <h3>История ходов</h3>

    <table className={styles.historyTable}>
      <TableHeader />

      {moves && (
        <tbody>
          {moves.map((move, index) => (
            <TableRow
              key={index}
              num={index}
              move={move}
              setMove={canMove(index) ? setMove : undefined}
            />
          ))}
        </tbody>
      )}
    </table>
  </Fragment>
));
