import { observer } from "mobx-react-lite";
import styles from "./index.module.css";
import {
  AiOutlineArrowDown,
  BsArrowUpRight,
  FaChessKnight,
  HiOutlineRefresh,
} from "react-icons/all";
import React, { FC, Fragment } from "react";
import { Move, UndoMove } from "../../../game/game";
import { Button, notification } from "antd";
import { clipboard } from "electron";

interface Props {
  moves?: Move[];
  onRevert?: (moveNumber: number) => void;
  undo?: UndoMove;
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
  onRevert?: (moveNumber: number) => void;
}

const TableRow: FC<RowProps> = ({ move, num, onRevert }) => (
  <tr
    title="Скопировать позицию в нотации FEN"
    role="button"
    onClick={() => copyFen(num, move.fenAfter)}
  >
    <td>
      {onRevert ? (
        <Button
          size="small"
          type="primary"
          title="Вернуться к ходу"
          onClick={(e) => {
            e.stopPropagation();
            onRevert(num);
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

export const MoveHistory = observer<Props>(({ moves, undo, onRevert }) => {
  function calculateRevert(moveNumber: number) {
    if (moveNumber < 1) {
      return undefined;
    }
    if (undo === UndoMove.Full) {
      return onRevert;
    }
    if (undo === UndoMove.Single && moves && moveNumber === moves.length - 2) {
      return onRevert;
    }
    return undefined;
  }

  return (
    <Fragment>
      <h3>История ходов</h3>

      <table className={styles.historyTable}>
        <TableHeader />

        {moves && (
          <tbody>
            {moves.map((move, index) => (
              <TableRow
                key={index}
                move={move}
                num={index}
                onRevert={calculateRevert(index)}
              />
            ))}
          </tbody>
        )}
      </table>
    </Fragment>
  );
});
