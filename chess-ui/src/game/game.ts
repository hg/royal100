import { Api } from "chessgroundx/api";
import { Color, FEN, Key, Letter, Piece, Role } from "chessgroundx/types";
import { Chessground } from "chessgroundx";
import { Clock } from "./clock";
import { choosePromotion, confirmPrincessPromotion } from "./gameUi";
import {
  action,
  computed,
  IReactionDisposer,
  makeObservable,
  observable,
  reaction,
} from "mobx";
import assert from "assert";
import { opposite } from "chessgroundx/util";
import { BestMove, Score, ScoreType } from "../utils/chess";
import { numCpus } from "../utils/system";
import { isEmpty } from "../utils/util";
import {
  Engine,
  EngineEvent,
  Fen,
  fenToString,
  fixBoardFen,
  ValidMoves,
} from "./engine";
import {
  depth,
  dimension,
  drawHalfMoves,
  drawMinMoves,
  fens,
  pieces,
} from "../utils/consts";
import { playMoveSound, playSelectSound } from "./sounds";
import { secToMs } from "../utils/time";
import { SerializedState } from "./state";
import { cloneAddressRows } from "./address";

export enum OpponentType {
  Computer = "Computer",
  Human = "Human",
}

export enum UndoMove {
  None = "None",
  Single = "Single",
  Full = "Full",
}

export interface GameConfig {
  opponent: OpponentType;
  depth: number;
  myColor: Color;
  fen?: FEN;
  totalTime: number;
  plyIncrement: number;
  plyTime?: number;
  undo: UndoMove;
  showAnalysis: boolean;
}

export const defaultConfig: GameConfig = {
  myColor: "white",
  depth: depth.default,
  totalTime: 600,
  plyIncrement: 10,
  opponent: OpponentType.Computer,
  undo: UndoMove.Single,
  showAnalysis: true,
};

export interface Move {
  color: Color;
  from: Key;
  to: Key;
  captured?: Piece;
  check: boolean;
  mate: boolean;
  piece: Piece;
  fen: string;
}

export interface Clocks {
  used: boolean;
  white: Clock;
  black: Clock;
}

export enum StateType {
  Paused = "Paused",
  Playing = "Playing",
  Win = "Win",
  Draw = "Draw",
}

export type GameState =
  | { state: StateType.Paused }
  | { state: StateType.Playing }
  | { state: StateType.Draw; reason: DrawReason }
  | { state: StateType.Win; side: Color; reason: WinReason };

export enum WinReason {
  Mate = "Mate",
  Timeout = "Timeout",
  Resign = "Resign",
}

export enum DrawReason {
  Agreement = "Agreement",
  Stalemate = "Stalemate",
  HalfMoves = "HalfMoves",
}

export class Game {
  private config?: GameConfig;
  private readonly engine: Engine;
  private readonly ground: Api;
  private undidMove?: Color;
  private previousFen = "";
  private reactionDisposers: IReactionDisposer[] = [];
  private validMoves?: ValidMoves;
  private promotion?: Letter;
  private coronation?: "K" | "Q";
  private plyIncrement = 0;
  private showAnalysis = true;
  @observable private opponent = OpponentType.Computer;
  @observable private myColor: Color = "white";
  @observable private score?: Score;
  @observable private undo: UndoMove = UndoMove.Single;
  @observable currentMove?: number;
  @observable state: GameState = { state: StateType.Paused };
  @observable moves: Move[] = [];
  @observable isThinking = false;
  @observable bottomColor: Color = "black";
  @observable clocks: Clocks = {
    used: true,
    white: new Clock(),
    black: new Clock(),
  };
  @observable fen: Fen = null!;
  @observable premove?: { sources: Key[]; target: Key };

  @computed
  get gameScore(): Score | undefined {
    if (this.showAnalysis) {
      return this.score;
    }
    return undefined;
  }

  @computed
  get turnColor(): Color {
    return this.fen.color;
  }

  constructor(private element: HTMLElement) {
    makeObservable(this);

    const resizer = new ResizeObserver(this.redraw);
    resizer.observe(element);

    this.onMove = this.onMove.bind(this);
    this.canUndo = this.canUndo.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.serialize = this.serialize.bind(this);

    this.engine = new Engine(this.clocks);
    this.engine.on(EngineEvent.Score, this.setScore);

    this.ground = Chessground(element, {
      geometry: dimension.dim10x10,
      variant: "chess",
      autoCastle: false,
      resizable: true,
      movable: {
        free: false,
        showDests: true,
      },
      events: {
        move: this.onMove,
        select: this.onSelect,
      },
    });

    this.reactionDisposers.push(
      reaction(
        () => this.clocks.white.remainingSecs,
        (secs) => {
          if (this.clocks.used && secs <= 0) {
            this.setState({
              state: StateType.Win,
              side: "black",
              reason: WinReason.Timeout,
            });
          }
        }
      ),

      reaction(
        () => this.clocks.black.remainingSecs,
        (secs) => {
          if (this.clocks.used && secs <= 0) {
            this.setState({
              state: StateType.Win,
              side: "white",
              reason: WinReason.Timeout,
            });
          }
        }
      )
    );

    this.redraw();
  }

  @action.bound
  private redraw() {
    this.ground?.redrawAll();
    if (this.element) {
      cloneAddressRows(this.element);
    }
  }

  @action.bound
  dispose() {
    for (const disposer of this.reactionDisposers) {
      disposer();
    }
    this.reactionDisposers.splice(0);
    this.engine.off(EngineEvent.Score, this.setScore);
  }

  serialize(): SerializedState {
    assert.ok(this.config);

    return {
      version: 1,
      state: this.state,
      undo: this.undo,
      clocks: {
        white: {
          remaining: this.clocks.white.remainingMs,
          total: this.clocks.white.totalMs,
        },
        black: {
          remaining: this.clocks.black.remainingMs,
          total: this.clocks.black.totalMs,
        },
      },
      config: this.config,
      moves: this.moves,
    };
  }

  @computed
  get canUndoLastMove(): boolean {
    return this.canUndo(this.moves.length - 2);
  }

  @action.bound
  undoLastMove() {
    this.undoMove(this.moves.length - 2);
  }

  canUndo(moveNumber: number): boolean {
    const move = this.moves[moveNumber];
    if (!move) {
      return false;
    }
    // Если игра завершена — даём возможность изучать историю
    if (!this.isPlaying) {
      return true;
    }
    // Если играем с движком — отменять можно только во время своего хода
    if (this.isOpponentAComputer && this.turnColor !== this.myColor) {
      return false;
    }
    if (this.undo === UndoMove.None) {
      return false;
    }
    // Нам нужна возможность вытаскивать fen из предыдущих двух ходов
    if (moveNumber < 2) {
      return false;
    }
    // Отмена только своих ходов
    if (move.color !== this.turnColor) {
      return false;
    }
    if (this.undo === UndoMove.Single) {
      // Если недавно отменяли — больше нельзя
      if (this.undidMove === this.turnColor) {
        return false;
      }
      // Отмена только последнего хода
      if (moveNumber < this.moves.length - 2) {
        return false;
      }
    }
    return true;
  }

  @action.bound
  async undoMove(moveNumber: number) {
    if (!this.canUndo(moveNumber)) {
      return;
    }

    this.currentMove = moveNumber;

    const undoMove = this.moves[moveNumber];
    assert.ok(undoMove);

    // Если не играем — больше ничего делать не нужно,
    // даём спокойно изучать историю вперёд/назад.
    if (!this.isPlaying) {
      await this.setFen(undoMove.fen, []);
      this.ground.setShapes([
        { orig: undoMove.from, dest: undoMove.to, brush: "blue" },
      ]);
      this.ground.set({ check: undoMove.check || undoMove.mate });
      return;
    }

    const prevMove = this.moves[moveNumber - 1];
    const prevPrevMove = this.moves[moveNumber - 2];

    if (undoMove && prevMove && prevPrevMove) {
      // Удаляем всё, начиная с предыдущего шага
      this.moves.splice(moveNumber - 1);

      // Останавливаем все часы — если белые отменяют свой ход,
      // это не повод зачислять лишнее время чёрным.
      this.clocks.white.stop();
      this.clocks.black.stop();

      // Повторяем последний шаг, который нужно сохранить
      await this.setFen(prevPrevMove.fen, []);
      this.previousFen = prevPrevMove.fen;
      this.undidMove = undoMove.color;
      this.ground.move(prevMove.from, prevMove.to);
    }
  }

  @action.bound
  private setScore(score: Score) {
    this.score = score;
  }

  @computed
  get isOpponentAComputer(): boolean {
    return this.opponent === OpponentType.Computer;
  }

  @computed
  get isOpponentHuman(): boolean {
    return !this.isOpponentAComputer;
  }

  @computed
  get topColor(): Color {
    return opposite(this.bottomColor);
  }

  @computed
  get hasWon(): boolean {
    return (
      !this.isPlaying &&
      (this.isOpponentHuman ||
        (this.state.state === StateType.Win &&
          this.state.side === this.myColor))
    );
  }

  @computed
  get isPlaying(): boolean {
    return this.state.state === StateType.Playing;
  }

  @computed
  get isMate(): boolean {
    return (
      this.state.state === StateType.Win && this.state.reason === WinReason.Mate
    );
  }

  @computed
  get isMyTurn(): boolean {
    return (
      this.isPlaying &&
      (this.turnColor === this.myColor || this.isOpponentHuman)
    );
  }

  @computed
  get canOfferDraw(): boolean {
    return Boolean(
      this.isOpponentAComputer &&
        this.isPlaying &&
        this.moves.length >= drawMinMoves &&
        this.score
    );
  }

  @action.bound
  private setState(state: GameState) {
    this.state = state;

    if (!this.isPlaying) {
      this.ground.stop();
      this.clocks.black.stop();
      this.clocks.white.stop();
      this.ground.set({
        movable: { color: undefined },
      });
      this.currentMove = this.moves.length ? this.moves.length - 1 : undefined;
    }
  }

  private locatePiece(role: Role, color: Color): Key | undefined {
    const { pieces } = this.ground.state;

    for (const [key, piece] of Object.entries(pieces)) {
      if (piece && piece.role === role && piece.color === color) {
        return key as Key;
      }
    }

    return undefined;
  }

  @observable
  selected?: Key;

  @action.bound
  select(selected?: Key) {
    this.ground.set({ selected });
  }

  private onSelect(_key: Key) {
    const { state } = this.ground;
    if (state.selected) {
      const piece = state.pieces[state.selected];
      playSelectSound(piece);
    }
    this.selected = state.selected;
  }

  private async detectCheck(): Promise<Color | undefined> {
    const { pieces } = this.ground.state;

    for (const key of await this.engine.checkers()) {
      const piece = pieces[key];
      if (piece) {
        const check = opposite(piece.color);
        this.ground.set({ check });
        return check;
      }
    }

    this.ground.set({ check: false });

    return undefined;
  }

  private async onMove(orig: Key, dest: Key, capturedPiece?: Piece) {
    this.premove = undefined;

    if (this.isPlaying) {
      this.currentMove = undefined;
    }

    if (!capturedPiece) {
      const enpTo = this.fen.enPassant?.to;
      if (enpTo) {
        const [destFile, destRank] = dest;
        const [enpFile, enpRank] = enpTo;
        if (destFile === enpFile) {
          // Have we moved behind the pawn?
          const expectedSign = this.turnColor === "white" ? 1 : -1;
          const sign = Math.sign(Number(destRank) - Number(enpRank));
          if (sign === expectedSign) {
            capturedPiece = {
              color: opposite(this.turnColor),
              role: pieces.pawn,
            };
          }
        }
      }
    }

    playMoveSound();

    if (this.turnColor === this.undidMove) {
      this.undidMove = undefined;
    }

    if (this.isMyTurn) {
      this.promotion = await this.checkPawnPromotions(orig, dest);
    }

    await this.setFen(this.fen.to, [`${orig}${dest}${this.promotion || ""}`]);

    this.promotion = undefined;

    this.ground.set({
      check: false,
      drawable: { shapes: [] },
    });

    const move: Move = {
      from: orig,
      to: dest,
      captured: capturedPiece,
      piece: this.ground.state.pieces[dest]!,
      color: opposite(this.turnColor),
      fen: this.fen.to,
      mate: false,
      check: false,
    };

    this.previousFen = this.fen.to;

    if (capturedPiece) {
      await this.checkRoyaltyPromotions(capturedPiece);
    }

    if (this.isOpponentAComputer && this.turnColor === this.myColor) {
      if (this.coronation === "Q") {
        const princess = this.locatePiece(
          pieces.princess,
          opposite(this.turnColor)
        );
        if (princess) {
          this.ground.setPieces({
            [princess]: {
              role: pieces.queen,
              color: opposite(this.turnColor),
              promoted: true,
            },
          });
          this.fen.pieces = fixBoardFen(this.ground.getFen());
          this.fen.to = fenToString(this.fen);
        }
        this.coronation = undefined;
      }
    }

    if (this.clocks.used) {
      const prevClock = this.clocks[opposite(this.turnColor)];
      prevClock.stop();
      prevClock.add(this.plyIncrement);
      this.clocks[this.turnColor].continue();
    }

    const check = await this.detectCheck();
    await this.detectEndGame(check);

    move.check = Boolean(check);
    move.mate = this.isMate;
    this.moves.push(move);

    if (!this.isPlaying) {
      return;
    }

    await this.makeOpponentMove();
  }

  private async checkRoyaltyPromotions({ color, role }: Piece) {
    // Движок не проверяем — он сам выполняет замену своих фигур
    if (!this.isMyTurn) {
      return;
    }

    // Срубили принцессу — её больше нельзя превратить
    if (role === pieces.princess) {
      this.fen.princess[color] = false;
    }

    // Если срубили ферзя — пробуем поднять принцессу в ферзя
    if (role === pieces.queen) {
      if (!this.fen.princess[color]) {
        return;
      }
      this.fen.princess[color] = false;
      const princessLocation = this.locatePiece(pieces.princess, color);
      if (!princessLocation) {
        return;
      }
      const promote = await confirmPrincessPromotion();
      if (!promote) {
        return;
      }
      // Подменяем принцессу на ферзя и обновляем FEN
      this.ground.setPieces({
        [princessLocation]: {
          role: pieces.queen,
          color: color,
          promoted: true,
        },
      });
      this.fen.pieces = fixBoardFen(this.ground.getFen());
      this.fen.to = fenToString(this.fen);
    }
  }

  private async checkPawnPromotions(
    orig: Key,
    dest: Key
  ): Promise<Letter | undefined> {
    const promotions = this.validMoves?.promotions;
    if (promotions && this.isMyTurn) {
      const available = promotions[orig + dest];
      if (available?.length) {
        return await choosePromotion(this.turnColor, available);
      }
    }
    return undefined;
  }

  private async hasMoves(color: Color): Promise<boolean> {
    await this.updateValidMoves({ ...this.fen, color });
    return !(this.validMoves && isEmpty(this.validMoves.destinations));
  }

  private async detectEndGame(check?: Color) {
    assert.ok(this.isPlaying);

    // 50 полуходов — ничья
    if (this.fen.halfMoves >= drawHalfMoves) {
      this.setState({ state: StateType.Draw, reason: DrawReason.HalfMoves });
      return;
    }

    // У текущей стороны есть возможные ходы — игра не закончена
    if (await this.hasMoves(this.turnColor)) {
      return;
    }

    const opponent = opposite(this.turnColor);

    // Если у противника есть ходы — смотрим, находится ли король под шахом
    if (await this.hasMoves(opponent)) {
      if (check) {
        // Король под шахом, мы проиграли
        this.setState({
          state: StateType.Win,
          side: opponent,
          reason: WinReason.Mate,
        });
      } else {
        // Шаха нет, ничья
        this.setState({ state: StateType.Draw, reason: DrawReason.Stalemate });
      }
    } else {
      // У противника тоже нет ходов — ничья
      this.setState({ state: StateType.Draw, reason: DrawReason.Stalemate });
    }
  }

  async restoreGame(state: SerializedState) {
    assert.ok(!this.isPlaying);

    if (state.version !== 1) {
      throw new Error("invalid state version " + state.version);
    }

    await this.assignConfig(state.config);

    this.moves = state.moves;
    this.currentMove = state.moves.length ? state.moves.length - 1 : undefined;
    this.undo = state.undo;
    this.clocks.white.set(
      state.clocks.white.remaining,
      state.clocks.white.total
    );
    this.clocks.black.set(
      state.clocks.black.remaining,
      state.clocks.black.total
    );

    const lastMove = state.moves[state.moves.length - 1];
    await this.setFen(lastMove?.fen || state.config.fen || fens.start, []);

    this.setState(state.state);

    if (this.isPlaying) {
      await this.updateValidMoves(this.fen);
      await this.makeOpponentMove();
    }
  }

  private async assignConfig(config: GameConfig) {
    await this.engine.newGame({
      depth: config.depth > depth.max ? undefined : config.depth,
      threads: numCpus(),
      moveTime: config.plyTime,
    });

    this.config = config;
    this.opponent = config.opponent;
    this.bottomColor = this.isOpponentAComputer ? config.myColor : "white";
    this.myColor = config.myColor;
    this.undo = config.undo;
    this.showAnalysis = config.showAnalysis;
    this.plyIncrement = secToMs(config.plyIncrement);
    this.moves.splice(0);

    this.clocks.used = config.totalTime > 0;
    if (this.clocks.used) {
      this.clocks.white.set(secToMs(config.totalTime));
      this.clocks.black.set(secToMs(config.totalTime));
    }

    this.ground.set({
      orientation: this.bottomColor,
      movable: { color: this.bottomColor },
      lastMove: undefined,
    });
  }

  async newGame(config: GameConfig) {
    assert.ok(!this.isPlaying);

    this.currentMove = undefined;
    await this.assignConfig(config);
    await this.setFen(config.fen || fens.start, []);

    this.setState({ state: StateType.Playing });
    await this.updateValidMoves(this.fen);

    await this.makeOpponentMove();
  }

  private async setFen(fen: string, moves: string[]) {
    this.fen = await this.engine.fen(fen, moves);
    this.ground.set({
      fen: this.fen.pieces,
      turnColor: this.turnColor,
    });
    if (this.isOpponentHuman) {
      this.ground.set({
        movable: { color: this.turnColor },
      });
    }
  }

  private async updateValidMoves(fen: Fen) {
    const str = fenToString(fen);
    this.validMoves = await this.engine.validMoves(str);

    this.ground.set({
      movable: {
        dests: this.validMoves.destinations,
      },
    });
  }

  @action.bound
  finishMove(source: Key) {
    const { premove } = this;
    if (premove?.sources.includes(source)) {
      this.move(source, premove.target);
    }
    this.premove = undefined;
  }

  @action.bound
  setMove(sources: Key[], target: Key) {
    assert.ok(sources.length > 1);

    this.ground.setShapes(
      sources.map((source) => ({
        orig: source,
        dest: target,
        brush: "blue",
      }))
    );

    this.premove = { sources, target };
  }

  @action.bound
  move(from: Key, to: Key) {
    if (this.isMyTurn && this.validMovesTo(to).includes(from)) {
      this.ground.move(from, to);
    }
  }

  validMovesTo(to: Key): Key[] {
    const destinations = this.validMoves?.destinations;
    if (!destinations) {
      return [];
    }
    return Object.entries(destinations)
      .map(([source, targets]) => (targets.includes(to) ? source : null))
      .filter(Boolean) as Key[];
  }

  @action.bound
  private setThinking(enabled: boolean) {
    this.isThinking = enabled;
  }

  async getHint(): Promise<BestMove | undefined> {
    this.setThinking(true);
    try {
      const move = await this.engine.calculateMove(this.fen.to);
      if (move) {
        this.ground.selectSquare(move.from);
        this.ground.setShapes([
          {
            orig: move.from,
            dest: move.to,
            brush: "green",
          },
        ]);
      }
      return move;
    } finally {
      this.setThinking(false);
    }
  }

  async offerDraw() {
    assert.deepStrictEqual(this.opponent, OpponentType.Computer);

    if (!this.canOfferDraw) {
      return false;
    }
    assert.ok(this.score);

    this.setThinking(true);
    try {
      await this.engine.calculateMove(this.fen.to);
    } finally {
      this.setThinking(false);
    }

    if (this.score.type === ScoreType.Mate) {
      return false;
    }

    assert.deepStrictEqual(this.score.type, ScoreType.Chances);

    if (this.score.value >= 20) {
      return false;
    }

    this.setState({ state: StateType.Draw, reason: DrawReason.Agreement });

    return true;
  }

  @action.bound
  resign() {
    if (this.isPlaying) {
      const loser = this.isOpponentHuman ? this.turnColor : this.myColor;
      this.setState({
        state: StateType.Win,
        side: opposite(loser),
        reason: WinReason.Resign,
      });
    }
  }

  private async makeOpponentMove() {
    if (this.isOpponentHuman || this.turnColor === this.myColor) {
      return;
    }

    const lastMove = this.moves[this.moves.length - 1];

    const fen = lastMove
      ? `${this.fen.from} moves ${lastMove.from}${lastMove.to}`
      : this.fen.to;

    this.setThinking(true);
    try {
      const move = await this.engine.calculateMove(fen);
      if (move) {
        this.coronation = move.coronation;
        this.promotion = move.promotion;
        const captured = this.ground.state.pieces[move.to];
        await this.onMove(move.from, move.to, captured);
      }
    } finally {
      this.setThinking(false);
    }
  }

  @action.bound
  async stopThinking() {
    if (this.isThinking) {
      await this.engine.stopThinking();
    }
  }

  @action.bound
  stop() {
    this.setState({ state: StateType.Paused });
    this.engine.quit();
  }
}
