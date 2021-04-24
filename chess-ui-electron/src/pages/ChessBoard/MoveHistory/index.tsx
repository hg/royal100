import { observer } from "mobx-react-lite";
import styles from "./index.module.css";
import {
  AiOutlineArrowDown,
  BsArrowUpRight,
  FaChessKnight,
  HiOutlineRefresh,
} from "react-icons/all";
import React, { FC, Fragment, Ref, useEffect, useRef } from "react";
import { Move } from "../../../game/game";
import { Button, Empty, notification } from "antd";
import { clipboard } from "electron";
import { formatMove } from "./util";
import { Color, Role } from "chessgroundx/types";

interface Props {
  detailed: boolean;
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
  isLast: boolean;
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

const TableRow: FC<RowProps> = ({ move, num, setMove, isLast }) => {
  const ref = useScrolling(isLast);

  return (
    <tr
      ref={ref as Ref<HTMLTableRowElement>}
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
        <MovePiece role={move.piece?.role} color={move.color} />
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
    <div
      className={`${styles.compactMove} ${setMove && styles.canMove}`}
      ref={ref as Ref<HTMLDivElement>}
      role="button"
      title={setMove && "Вернуться к ходу"}
      onClick={setMove}
    >
      <MovePiece role={move.piece?.role} color={move.color} />
      {formatMove(move.from)} {formatMove(move.to)}
      {move.captured && (
        <Fragment>
          {" "}
          ×
          <MovePiece role={move.captured.role} color={move.captured.color} />
        </Fragment>
      )}
    </div>
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
  ({ moves, canMove, setMove }) => (
    <table className={styles.historyTable}>
      <TableHeader />

      <tbody>
        {moves.map((move, index) => (
          <TableRow
            key={index}
            num={index}
            move={move}
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
