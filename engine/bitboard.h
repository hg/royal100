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

#ifndef BITBOARD_H_INCLUDED
#define BITBOARD_H_INCLUDED

#include <string>
#include <iostream>
#include <bitset>

#include "types.h"

namespace Bitboards {

void init();
const std::string pretty(Bitboard b);

}

constexpr Bitboard AllSquares = (~Bitboard(0)) >> 28;
constexpr Bitboard DarkSquares = (Bitboard(0xAA955ULL))
                               + (Bitboard(0xAA955ULL) << 20)
                               + (Bitboard(0xAA955ULL) << 40)
                               + (Bitboard(0xAA955ULL) << 60)
                               + (Bitboard(0xAA955ULL) << 80);
constexpr Bitboard FileABB = (Bitboard(0x10040100401ULL) << 50)
                           +  Bitboard(0x10040100401ULL);
constexpr Bitboard FileBBB = FileABB << 1;
constexpr Bitboard FileCBB = FileABB << 2;
constexpr Bitboard FileDBB = FileABB << 3;
constexpr Bitboard FileEBB = FileABB << 4;
constexpr Bitboard FileFBB = FileABB << 5;
constexpr Bitboard FileGBB = FileABB << 6;
constexpr Bitboard FileHBB = FileABB << 7;
constexpr Bitboard FileIBB = FileABB << 8;
constexpr Bitboard FileJBB = FileABB << 9;

constexpr Bitboard Rank1BB = 0x3FF;
constexpr Bitboard Rank2BB = Rank1BB << (10* 1);
constexpr Bitboard Rank3BB = Rank1BB << (10* 2);
constexpr Bitboard Rank4BB = Rank1BB << (10* 3);
constexpr Bitboard Rank5BB = Rank1BB << (10* 4);
constexpr Bitboard Rank6BB = Rank1BB << (10* 5);
constexpr Bitboard Rank7BB = Rank1BB << (10* 6);
constexpr Bitboard Rank8BB = Rank1BB << (10* 7);
constexpr Bitboard Rank9BB = Rank1BB << (10* 8);
constexpr Bitboard Rank10BB= Rank1BB << (10* 9);

constexpr Bitboard QueenSide   = FileABB | FileBBB | FileCBB | FileDBB;
constexpr Bitboard CenterFiles = FileDBB | FileEBB | FileFBB | FileGBB;
constexpr Bitboard KingSide    = FileGBB | FileHBB | FileIBB | FileJBB;
constexpr Bitboard Center      = (FileEBB | FileFBB) & (Rank5BB | Rank6BB);
constexpr Bitboard EPRanks     = Rank3BB | Rank4BB | Rank7BB | Rank8BB;

constexpr Bitboard KingFlank[FILE_NB] = {
  QueenSide ^ FileDBB, QueenSide, QueenSide,
  CenterFiles, CenterFiles,
  KingSide, KingSide, KingSide ^ FileGBB
};

extern uint8_t SquareDistance[SQUARE_NB][SQUARE_NB];

extern Bitboard LineBB[SQUARE_NB][SQUARE_NB];
extern Bitboard PseudoAttacks[PIECE_TYPE_NB][SQUARE_NB];

inline Bitboard square_bb(Square s) {
  assert(is_ok(s));
  return Bitboard(1) << s;
}


/// Overloads of bitwise operators between a Bitboard and a Square for testing
/// whether a given bit is set in a bitboard, and for setting and clearing bits.

inline Bitboard  operator&( Bitboard  b, Square s) { return b &  square_bb(s); }
inline Bitboard  operator|( Bitboard  b, Square s) { return b |  square_bb(s); }
inline Bitboard  operator^( Bitboard  b, Square s) { return b ^  square_bb(s); }
inline Bitboard& operator|=(Bitboard& b, Square s) { return b |= square_bb(s); }
inline Bitboard& operator^=(Bitboard& b, Square s) { return b ^= square_bb(s); }

inline Bitboard  operator&(Square s, Bitboard b) { return b & s; }
inline Bitboard  operator|(Square s, Bitboard b) { return b | s; }
inline Bitboard  operator^(Square s, Bitboard b) { return b ^ s; }

inline Bitboard  operator|(Square s, Square s2) { return square_bb(s) | s2; }

constexpr bool more_than_one(Bitboard b) {
  return b & (b - 1);
}

constexpr bool opposite_colors(Square s1, Square s2) {
  return (s1 + rank_of(s1) + s2 + rank_of(s2)) & 1;
}


/// rank_bb() and file_bb() return a bitboard representing all the squares on
/// the given file or rank.

inline Bitboard rank_bb(Rank r) {
  return Rank1BB << (10 * r);
}

inline Bitboard rank_bb(Square s) {
  return rank_bb(rank_of(s));
}

inline Bitboard file_bb(File f) {
  return FileABB << f;
}

inline Bitboard file_bb(Square s) {
  return file_bb(file_of(s));
}


/// shift() moves a bitboard one or two steps as specified by the direction D

template<Direction D>
constexpr Bitboard shift(Bitboard b) {
  return AllSquares & 
        ( D == NORTH       ?  b                        <<10
        : D == SOUTH       ?  b                        >> 10
        : D == NORTH+NORTH ?  b                        <<20
        : D == NORTH+NORTH+NORTH ?  b                  <<30
        : D == SOUTH+SOUTH ?  b                        >>20
        : D == SOUTH+SOUTH+SOUTH ?  b                  >>30
        : D == EAST+EAST   ? (b & ~FileJBB & ~FileIBB) << 2
        : D == WEST+WEST   ? (b & ~FileABB & ~FileBBB) >> 2
        : D == EAST        ? (b & ~FileJBB)            << 1
        : D == WEST        ? (b & ~FileABB)            >> 1
        : D == NORTH_EAST  ? (b & ~FileJBB)            <<11
        : D == NORTH_WEST  ? (b & ~FileABB)            << 9
        : D == SOUTH_EAST  ? (b & ~FileJBB)            >> 9
        : D == SOUTH_WEST  ? (b & ~FileABB)            >>11
        : 0);
}


/// pawn_attacks_bb() returns the squares attacked by pawns of the given color
/// from the squares in the given bitboard.

template<Color C>
constexpr Bitboard pawn_attacks_bb(Bitboard b) {
  return C == WHITE ? shift<NORTH_WEST>(b) | shift<NORTH_EAST>(b)
                    : shift<SOUTH_WEST>(b) | shift<SOUTH_EAST>(b);
}

constexpr Bitboard pawn_attacks_bb(Color c, Bitboard b) {
  return c == WHITE ? pawn_attacks_bb<WHITE>(b)
                    : pawn_attacks_bb<BLACK>(b);
}

inline Bitboard pawn_attacks_bb(Color c, Square s) {

  assert(is_ok(s));
  return c == WHITE ? pawn_attacks_bb<WHITE>(square_bb(s))
                    : pawn_attacks_bb<BLACK>(square_bb(s));
}


/// pawn_double_attacks_bb() returns the squares doubly attacked by pawns of the
/// given color from the squares in the given bitboard.

template<Color C>
constexpr Bitboard pawn_double_attacks_bb(Bitboard b) {
  return C == WHITE ? shift<NORTH_WEST>(b) & shift<NORTH_EAST>(b)
                    : shift<SOUTH_WEST>(b) & shift<SOUTH_EAST>(b);
}


/// adjacent_files_bb() returns a bitboard representing all the squares on the
/// adjacent files of the given one.

inline Bitboard adjacent_files_bb(Square s) {
  return shift<EAST>(file_bb(s)) | shift<WEST>(file_bb(s));
}


/// line_bb(Square, Square) returns a bitboard representing an entire line,
/// from board edge to board edge, that intersects the given squares. If the
/// given squares are not on a same file/rank/diagonal, returns 0. For instance,
/// line_bb(SQ_C4, SQ_F7) will return a bitboard with the A2-G8 diagonal.

inline Bitboard line_bb(Square s1, Square s2) {

    assert(is_ok(s1));
    assert(is_ok(s2));
  //assert(is_ok(s1) && is_ok(s2));
  return LineBB[s1][s2];
}


/// between_bb() returns a bitboard representing squares that are linearly
/// between the given squares (excluding the given squares). If the given
/// squares are not on a same file/rank/diagonal, return 0. For instance,
/// between_bb(SQ_C4, SQ_F7) will return a bitboard with squares D5 and E6.

inline Bitboard between_bb(Square s1, Square s2) {
  Bitboard b = line_bb(s1, s2) & ((AllSquares << s1) ^ (AllSquares << s2));
  return b & (b - 1); //exclude lsb
}


/// forward_ranks_bb() returns a bitboard representing the squares on the ranks
/// in front of the given one, from the point of view of the given color. For instance,
/// forward_ranks_bb(BLACK, SQ_D3) will return the 16 squares on ranks 1 and 2.

inline Bitboard forward_ranks_bb(Color c, Square s) {
  return c == WHITE ? ~Rank1BB << 10 * relative_rank(WHITE, s)
                    : (AllSquares & ~Rank10BB) >> 10 * relative_rank(BLACK, s);
}


/// forward_file_bb() returns a bitboard representing all the squares along the
/// line in front of the given one, from the point of view of the given color.

inline Bitboard forward_file_bb(Color c, Square s) {
  return forward_ranks_bb(c, s) & file_bb(s);
}


/// pawn_attack_span() returns a bitboard representing all the squares that can
/// be attacked by a pawn of the given color when it moves along its file, starting
/// from the given square.

inline Bitboard pawn_attack_span(Color c, Square s) {
  return forward_ranks_bb(c, s) & adjacent_files_bb(s);
}


/// passed_pawn_span() returns a bitboard which can be used to test if a pawn of
/// the given color and on the given square is a passed pawn.

inline Bitboard passed_pawn_span(Color c, Square s) {
  return pawn_attack_span(c, s) | forward_file_bb(c, s);
}


/// aligned() returns true if the squares s1, s2 and s3 are aligned either on a
/// straight or on a diagonal line.

inline bool aligned(Square s1, Square s2, Square s3) {
  return line_bb(s1, s2) & s3;
}


/// distance() functions return the distance between x and y, defined as the
/// number of steps for a king in x to reach y.

template<typename T1 = Square> inline int distance(Square x, Square y);
template<> inline int distance<File>(Square x, Square y) { return std::abs(file_of(x) - file_of(y)); }
template<> inline int distance<Rank>(Square x, Square y) { return std::abs(rank_of(x) - rank_of(y)); }
template<> inline int distance<Square>(Square x, Square y) { return SquareDistance[x][y]; }

inline int edge_distance(File f) { return std::min(f, File(FILE_J - f)); }
inline int edge_distance(Rank r) { return std::min(r, Rank(RANK_10 - r)); }


/// safe_destination() returns the bitboard of target square for the given step
/// from the given square. If the step is off the board, returns empty bitboard.

inline Bitboard safe_destination(Square s, int step)
{
    Square to = Square(s + step);
    return is_ok(to) && distance(s, to) <= 2 ? square_bb(to) : Bitboard(0);
}

inline Bitboard royal_attacks(Square sq, Bitboard occupied)
{
    Bitboard attacks = PseudoAttacks[KING][sq];
    Bitboard sbb = square_bb(sq);

    if (shift<NORTH>(sbb) & ~occupied) attacks |= shift<NORTH+NORTH>(sbb);
    if (shift<EAST>(sbb) & ~occupied) attacks |= shift<EAST+EAST>(sbb);
    if (shift<SOUTH>(sbb) & ~occupied) attacks |= shift<SOUTH+SOUTH>(sbb);
    if (shift<WEST>(sbb) & ~occupied) attacks |= shift<WEST+WEST>(sbb);

    if (shift<NORTH_WEST>(sbb) & ~occupied)
    {
        attacks |= shift<NORTH_WEST>(shift<NORTH_WEST>(sbb));
        attacks |= shift<NORTH+NORTH>(sbb);
        attacks |= shift<WEST + WEST>(sbb);
    }
    if (shift<NORTH_EAST>(sbb) & ~occupied)
    {
        attacks |= shift<NORTH_EAST>(shift<NORTH_EAST>(sbb));
        attacks |= shift<NORTH+NORTH>(sbb);
        attacks |= shift<EAST + EAST>(sbb);
    }
    if (shift<SOUTH_EAST>(sbb) & ~occupied)
    {
        attacks |= shift<SOUTH_EAST>(shift<SOUTH_EAST>(sbb));
        attacks |= shift<SOUTH+SOUTH>(sbb);
        attacks |= shift<EAST + EAST>(sbb);
    }
    if (shift<SOUTH_WEST>(sbb) & ~occupied)
    {
        attacks |= shift<SOUTH_WEST>(shift<SOUTH_WEST>(sbb));
        attacks |= shift<SOUTH+SOUTH>(sbb);
        attacks |= shift<WEST + WEST>(sbb);
    }

    //std::cout << "<prince moves: " << Bitboards::pretty(ourPieces)
                                   //<< Bitboards::pretty(theirPieces)
                                   //<< "<" << sq << ">"
                                   //<< Bitboards::pretty(attacks);
    return attacks;
}



/// attacks_bb(Square) returns the pseudo attacks of the give piece type
/// assuming an empty board.

template<PieceType Pt>
inline Bitboard attacks_bb(Square s) {

  assert((Pt != PAWN) && (is_ok(s)));

  return PseudoAttacks[Pt][s];
}

inline Bitboard sliding_attack(PieceType pt, Square sq, Bitboard occupied) {

    Bitboard attacks = 0;
    Direction   RookDirections[4] = {NORTH, SOUTH, EAST, WEST};
    Direction BishopDirections[4] = {NORTH_EAST, SOUTH_EAST, SOUTH_WEST, NORTH_WEST};

    occupied &= ~square_bb(sq);

    for(Direction d : (pt == ROOK ? RookDirections : BishopDirections))
    {
        Square s = sq;
        while(safe_destination(s, d) && !(occupied & s))
            attacks |= (s += d);
    }

    return attacks;
}


/// attacks_bb(Square, Bitboard) returns the attacks by the given piece
/// assuming the board is occupied according to the passed Bitboard.
/// Sliding piece attacks do not continue passed an occupied square.

template<PieceType Pt>
inline Bitboard attacks_bb(Square s, Bitboard occupied) {

  assert((Pt != PAWN) && (is_ok(s)));

  switch (Pt)
  {
  case BISHOP: return sliding_attack(BISHOP, s, occupied);
  case ROOK  : return sliding_attack(ROOK, s, occupied);
  case QUEEN : return attacks_bb<BISHOP>(s, occupied) |
                      attacks_bb<ROOK>(s, occupied);
  case PRINCESS:
       {
    //std::cout << "<princess moves: " << Bitboards::pretty(royal_attacks(s, occupied));
           //return PseudoAttacks[PRINCESS][s];
           return royal_attacks(s, occupied);
           //return PseudoAttacks[KING][s];
       }
  case PRINCE: 
       {
    //std::cout << "<prince moves: " << Bitboards::pretty(royal_attacks(s, occupied));
           //return PseudoAttacks[PRINCE][s];
           return royal_attacks(s, occupied);
           //return PseudoAttacks[KING][s];
       }
  default    : return PseudoAttacks[Pt][s]; //knights and kings
  }
}

inline Bitboard attacks_bb(PieceType pt, Square s, Bitboard occupied) {

  assert((pt != PAWN) && (is_ok(s)));

  switch (pt)
  {
  case BISHOP: return attacks_bb<BISHOP>(s, occupied);
  case ROOK  : return attacks_bb<  ROOK>(s, occupied);
  case QUEEN : return attacks_bb< QUEEN>(s, occupied);
  case PRINCESS : return attacks_bb<PRINCESS>(s, occupied);
  case PRINCE : return attacks_bb<PRINCE>(s, occupied);
  default    : return PseudoAttacks[pt][s];
  }
}

inline Bitboard royal_wall(Square s1, Square s2) {
    //assert(distance(s1, s2) == 2);
    assert(attacks_bb<ROOK>(s1) & s2);

    if(distance(s1, s2) != 2)
        return 0;

    Bitboard sbb = square_bb(s1);

    // NORTH
    if (s1 + NORTH + NORTH == s2)
        return shift<NORTH>(sbb) | shift<NORTH_WEST>(sbb) | shift<NORTH_EAST>(sbb);

    // EAST
    if (s1 + EAST + EAST == s2)
        return shift<EAST>(sbb) | shift<NORTH_EAST>(sbb) | shift<SOUTH_EAST>(sbb);

    // SOUTH
    if (s1 + SOUTH + SOUTH == s2)
        return shift<SOUTH_EAST>(sbb) | shift<SOUTH>(sbb) | shift<SOUTH_WEST>(sbb);

    // WEST
    if (s1 + WEST + WEST == s2)
        return shift<WEST>(sbb) | shift<NORTH_WEST>(sbb) | shift<SOUTH_WEST>(sbb);

    return 0;
}

/// popcount() counts the number of non-zero bits in a bitboard
inline int popcount(Bitboard b) {

  return (std::bitset<128>(b)).count();
}


/// lsb() and msb() return the least/most significant bit in a non-zero bitboard
inline Square lsb(Bitboard b) {
  assert(b);

  int square = 0;
  while(b)
  {
      if (b & 1) break;
      b >>= 1;
      square++;
  }

  return Square(square);
}

// Assumes at most the 100th bit is set.
inline Square msb(Bitboard b) {
  assert(b);

  constexpr Bitboard bit100 = Bitboard(1) << 100;
  int square = SQ_J10;
  while(b)
  {
      if (b & bit100) break;
      b <<= 1;
      square--;
  }

  return Square(square);
}

/// pop_lsb() finds and clears the least significant bit in a non-zero bitboard

inline Square pop_lsb(Bitboard* b) {
  assert(*b);
  const Square s = lsb(*b);
  *b &= *b - 1;
  return s;
}


/// frontmost_sq() returns the most advanced square for the given color,
/// requires a non-zero bitboard.
inline Square frontmost_sq(Color c, Bitboard b) {
  assert(b);
  return c == WHITE ? msb(b) : lsb(b);
}

#endif // #ifndef BITBOARD_H_INCLUDED
