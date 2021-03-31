import { observer } from "mobx-react-lite";
import styles from "./index.module.css";
import {
  AiOutlineArrowDown,
  BsArrowUpRight,
  FaChessKnight,
  HiOutlineRefresh,
} from "react-icons/all";
import React, { FC, Fragment } from "react";
import { Game, Move } from "../../../game/game";
import { notification } from "antd";
import { clipboard } from "electron";

interface Props {
  game?: Game;
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
}

const TableRow: FC<RowProps> = ({ move, num }) => (
  <tr
    title="Скопировать позицию в нотации FEN"
    role="button"
    onClick={() => copyFen(num, move.fen)}
  >
    <td>{num}</td>
    <td>
      <div
        className={`${move.piece?.role} ${move.color} ${styles.piece} ${styles.movePiece}`}
      />
    </td>
    <td>{move.from}</td>
    <td>{move.to}</td>
    <td>
      {move.captured && (
        <div
          className={`${move.captured.role} ${move.captured.color} ${styles.piece}`}
        />
      )}
    </td>
  </tr>
);

export const MoveHistory = observer<Props>(({ game }) => (
  <Fragment>
    <h3>История ходов</h3>

    <table className={styles.historyTable}>
      <TableHeader />

      <tbody>
        {game?.moves.map((move, index) => (
          <TableRow key={index} move={move} num={index + 1} />
        ))}
      </tbody>
    </table>
  </Fragment>
));
