import { observer } from "mobx-react-lite";
import styles from "./index.module.css";
import {
  AiOutlineArrowDown,
  BsArrowUpRight,
  FaChessKnight,
  HiOutlineRefresh,
} from "react-icons/all";
import React, { FC, Ref, useEffect, useRef } from "react";
import { Move } from "../../../game/game";
import { Button, Empty, notification } from "antd";
import { formatMove } from "./util";
import { Color, Role } from "chessgroundx/types";

interface Props {
  detailed: boolean;
  current?: number;
  moves: Move[];
  canMove: (moveNumber: number) => boolean;
  setMove: (moveNumber: number) => void;
}

function copyFen(num: number, fen: string) {
  notification.success({
    message: `Нотация хода №${num + 1} скопирована в буфер обмена`,
  });
  navigator.clipboard.writeText(fen);
}

const TableHeader = () => (
  <thead>
    <tr>
      <th title="Номер полухода">№</th>
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
  isLast: boolean;
  isCurrent: boolean;
  setMove?: () => void;
}

function useScrolling(isLast: boolean) {
  const ref = useRef<Element | null>(null);

  useEffect(() => {
    if (isLast) {
      ref.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLast]);

  return ref;
}

const TableRow: FC<RowProps> = ({ move, num, setMove, isLast, isCurrent }) => {
  const ref = useScrolling(isCurrent || isLast);

  return (
    <tr
      ref={ref as Ref<HTMLTableRowElement>}
      title="Скопировать позицию в нотации FEN"
      role="button"
      onClick={() => copyFen(num, move.fen)}
      className={`${styles.row} ${isCurrent ? styles.currentMove : ""} ${
        move.check && styles.check
      } ${move.mate && styles.mate}`}
    >
      <td>
        {setMove ? (
          <Button
            size="small"
            type="primary"
            title="Вернуться к ходу"
            onClick={(e) => {
              e.stopPropagation();
              setMove();
            }}
          >
            {num + 1}
          </Button>
        ) : (
          num + 1
        )}
      </td>
      <td>
        <MovePiece role={move.piece.role} color={move.color} />
      </td>
      <td>{formatMove(move.from)}</td>
      <td>{formatMove(move.to)}</td>
      <td>
        {move.captured ? (
          <MovePiece role={move.captured.role} color={move.captured.color} />
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
};

const NoMovesPlaceholder = () => (
  <div className={styles.noMoves}>
    <Empty description="Ходов пока нет." />
  </div>
);

const MovePiece: FC<{ role?: Role; color: Color }> = ({ role, color }) => (
  <div className={`${role} ${color} ${styles.piece}`} />
);

const CompactMove: FC<{
  move: Move;
  isLast: boolean;
  setMove?: () => void;
}> = ({ move, isLast, setMove }) => {
  const ref = useScrolling(isLast);

  return (
    <button
      className={`${styles.compactMove} ${setMove && styles.canMove} ${
        move.check && styles.check
      } ${move.mate && styles.mate}`}
      ref={ref as Ref<HTMLButtonElement>}
      title={setMove && "Вернуться к ходу"}
      onClick={setMove}
    >
      <MovePiece role={move.piece.role} color={move.color} />
      <span className={styles.moves}>
        {formatMove(move.from)} {formatMove(move.to)}
      </span>
      {move.captured && (
        <MovePiece role={move.captured.role} color={move.captured.color} />
      )}
    </button>
  );
};

export const CompactMoveHistory = observer<Props>(
  ({ moves, canMove, setMove }) => (
    <div className={styles.compactMoves}>
      {moves.map((move, index) => (
        <CompactMove
          key={index}
          move={move}
          isLast={index === moves.length - 1}
          setMove={canMove(index) ? () => setMove(index) : undefined}
        />
      ))}
    </div>
  )
);

export const DetailedMoveHistory = observer<Props>(
  ({ moves, canMove, setMove, current }) => (
    <table className={styles.historyTable}>
      <TableHeader />

      <tbody>
        {moves.map((move, index) => (
          <TableRow
            key={index}
            num={index}
            move={move}
            isCurrent={index === current}
            isLast={index === moves.length - 1}
            setMove={canMove(index) ? () => setMove(index) : undefined}
          />
        ))}
      </tbody>
    </table>
  )
);

export const MoveHistory = observer<Props>((props) =>
  props.moves.length ? (
    props.detailed ? (
      <DetailedMoveHistory {...props} />
    ) : (
      <CompactMoveHistory {...props} />
    )
  ) : (
    <NoMovesPlaceholder />
  )
);
