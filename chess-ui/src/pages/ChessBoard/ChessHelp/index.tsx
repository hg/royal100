import React, { FC, Fragment } from "react";
import { Tabs } from "antd";
import { BsArrowsMove, FaChessKnight, FaKeyboard } from "react-icons/all";
import Text from "antd/lib/typography/Text";

const C: FC = ({ children }) => <Text code>{children}</Text>;

const HelpKeyboardMoves: FC = () => (
  <Fragment>
    <h2>Ходы фигурами</h2>

    <p>Ходить фигурами можно с клавиатуры без использования мыши. Для этого:</p>

    <ol>
      <li>Дождитесь своего хода.</li>
      <li>
        Введите координаты целевой клетки, в которую желаете ходить.
        Последовательность клавиш не играет роли: для клетки <C>e5</C>
        можно нажать как <kbd>e</kbd>
        <kbd>5</kbd>, так и <kbd>5</kbd>
        <kbd>e</kbd>.
      </li>
      <li>
        Если в клетку может ходить одна фигура, она будет перемещена на
        введённый адрес.
      </li>
      <li>
        Если в клетку может ходить несколько фигур, они будут отмечены на доске.
        Введите координаты одной из фигур (аналогично предыдущему шагу), и она
        будет перемещена.
      </li>
    </ol>

    <p>
      То есть, ввод ходов осуществляется по схеме, похожей на алгебраическую
      шахматную нотацию.
    </p>

    <h3>Примеры</h3>

    <p>
      Вы хотите переместить фигуру <C>c3</C> в клетку <C>h8</C>, и в эту клетку
      может ходить только <C>c3</C>. Вам нужно нажать <kbd>h</kbd>
      <kbd>8</kbd>.
    </p>

    <p>
      Вы хотите переместить фигуру <C>a3</C> в клетку <C>d6</C>, и в эту клетку
      может ходить <C>a3</C> либо <C>j6</C>. Вам нужно нажать <kbd>d</kbd>
      <kbd>6</kbd>
      <kbd>a</kbd>
      <kbd>3</kbd>.
    </p>
  </Fragment>
);

export const ChessHelp: FC = () => (
  <Tabs tabPosition="right">
    <Tabs.TabPane
      key="keyboard-moves"
      tab={
        <Fragment>
          <BsArrowsMove className="icon-collapse" /> Ходы с клавиатуры
        </Fragment>
      }
    >
      <HelpKeyboardMoves />
    </Tabs.TabPane>

    <Tabs.TabPane
      key="hotkeys"
      tab={
        <Fragment>
          <FaKeyboard className="icon-collapse" /> Горячие клавиши
        </Fragment>
      }
    >
      Здесь пока пусто
    </Tabs.TabPane>

    <Tabs.TabPane
      key="rules"
      tab={
        <Fragment>
          <FaChessKnight className="icon" /> Правила игры
        </Fragment>
      }
    >
      Справки по правилам пока нет
    </Tabs.TabPane>
  </Tabs>
);
