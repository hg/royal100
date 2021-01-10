/*
  Stockfish, a UCI chess playing engine derived from Glaurung 2.1
  Copyright (C) 2004-2008 Tord Romstad (Glaurung author)
  Copyright (C) 2008-2015 Marco Costalba, Joona Kiiski, Tord Romstad
  Copyright (C) 2015-2020 Marco Costalba, Joona Kiiski, Gary Linscott, Tord Romstad

  Stockfish is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  Stockfish is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

#include <algorithm>
#include <bitset>
#include <iostream>

#include "bitboard.h"
#include "misc.h"

uint8_t SquareDistance[SQUARE_NB][SQUARE_NB];

Bitboard LineBB[SQUARE_NB][SQUARE_NB];
Bitboard PseudoAttacks[PIECE_TYPE_NB][SQUARE_NB];


/// Bitboards::pretty() returns an ASCII representation of a bitboard suitable
/// to be printed to standard output. Useful for debugging.

const std::string Bitboards::pretty(Bitboard b) {

  std::string s = "+---+---+---+---+---+---+---+---+---+---+\n";

  for (Rank r = RANK_10; r >= RANK_1; --r)
  {
      for (File f = FILE_A; f <= FILE_J; ++f)
          s += b & make_square(f, r) ? "| X " : "|   ";

      s += "| " + std::to_string(1 + r) + "\n+---+---+---+---+---+---+---+---+---+---+\n";
  }
  s += "  a   b   c   d   e   f   g   h   i   j\n";

  return s;
}


/// Bitboards::init() initializes various bitboard tables. It is called at
/// startup and relies on global objects to be already zero-initialized.

void Bitboards::init() {

  for (Square s1 = SQ_A1; s1 <= SQ_J10; ++s1)
      for (Square s2 = SQ_A1; s2 <= SQ_J10; ++s2)
          SquareDistance[s1][s2] = std::max(distance<File>(s1, s2), distance<Rank>(s1, s2));

  for (Square s1 = SQ_A1; s1 <= SQ_J10; ++s1)
  {
      for (int step : {NORTH, NORTH_EAST, EAST, SOUTH_EAST, SOUTH, SOUTH_WEST, WEST, NORTH_WEST} )
         PseudoAttacks[KING][s1] |= safe_destination(s1, step);

      for (int step : {NORTH+NORTH+EAST, EAST+EAST+NORTH,
                       EAST+EAST+SOUTH, SOUTH+SOUTH+EAST,
                       SOUTH+SOUTH+WEST, WEST+WEST+SOUTH,
                       WEST+WEST+NORTH, NORTH+NORTH+WEST} )
         PseudoAttacks[KNIGHT][s1] |= safe_destination(s1, step);

      PseudoAttacks[QUEEN][s1]  = PseudoAttacks[BISHOP][s1] = attacks_bb<BISHOP>(s1, 0);
      PseudoAttacks[QUEEN][s1] |= PseudoAttacks[  ROOK][s1] = attacks_bb<  ROOK>(s1, 0);

      //Royal pieces
      PseudoAttacks[PRINCESS][s1] = PseudoAttacks[KING][s1];
      PseudoAttacks[PRINCE][s1] = PseudoAttacks[KING][s1];

      for (int step : {NORTH+NORTH, NORTH_EAST+NORTH_EAST,
                       EAST + EAST, SOUTH_EAST+SOUTH_EAST,
                       SOUTH+SOUTH, SOUTH_WEST+SOUTH_WEST,
                       WEST + WEST, NORTH_WEST+NORTH_WEST} )
      {
          PseudoAttacks[PRINCESS][s1] |= safe_destination(s1, step);
          PseudoAttacks[PRINCE][s1] |= safe_destination(s1, step);
      }

      for (PieceType pt : { BISHOP, ROOK })
          for (Square s2 = SQ_A1; s2 <= SQ_J10; ++s2)
              if (PseudoAttacks[pt][s1] & s2)
              {
                  LineBB[s1][s2] = (attacks_bb(pt, s1, 0) & attacks_bb(pt, s2, 0)) | s1 | s2;
              }
  }
}

