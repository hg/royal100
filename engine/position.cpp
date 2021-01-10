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
#include <cassert>
#include <cstddef> // For offsetof()
#include <cstring> // For std::memset, std::memcmp
#include <iomanip>
#include <sstream>

#include "bitboard.h"
#include "misc.h"
#include "movegen.h"
#include "position.h"
#include "thread.h"
#include "uci.h"

using std::string;

namespace Zobrist {

  Key psq[PIECE_NB][SQUARE_NB];
  Key enpassant[SQUARE_NB];
  Key castling[CASTLING_RIGHT_NB];
  Key side, noPawns;
}

namespace {

const string PieceToChar(" PNBRSQTK        pnbrsqtk");

constexpr Piece Pieces[] = { W_PAWN, W_KNIGHT, W_BISHOP, W_ROOK, W_PRINCESS, W_QUEEN, W_PRINCE, W_KING,
                             B_PAWN, B_KNIGHT, B_BISHOP, B_ROOK, B_PRINCESS, B_QUEEN, B_PRINCE, B_KING };
} // namespace


/// operator<<(Position) returns an ASCII representation of the position

std::ostream& operator<<(std::ostream& os, const Position& pos) {

  os << "\n +---+---+---+---+---+---+---+---+---+---+\n";

  for (Rank r = RANK_10; r >= RANK_1; --r)
  {
      for (File f = FILE_A; f <= FILE_J; ++f)
          os << " | " << PieceToChar[pos.piece_on(make_square(f, r))];

      os << " | " << (r + 1) << "\n +---+---+---+---+---+---+---+---+---+---+\n";
  }

  os << "   a   b   c   d   e   f   g   h   i   j\n"
     << "\nFen: " << pos.fen() << "\nKey: " << std::hex << std::uppercase
     << std::setfill('0') << std::setw(16) << pos.key()
     << std::setfill(' ') << std::dec << "\nCheckers: ";

  for (Bitboard b = pos.checkers(); b; )
      os << UCI::square(pop_lsb(&b)) << " ";
     
  os << std::endl;

  return os;
}


/// Position::init() initializes at startup the various arrays used to compute hash keys

void Position::init() {

  PRNG rng(1070372);

  for (Piece pc : Pieces)
      for (Square s = SQ_A1; s <= SQ_J10; ++s)
          Zobrist::psq[pc][s] = rng.rand<Key>();

  for (Square s = SQ_A1; s <= SQ_J10; ++s)
      Zobrist::enpassant[s] = rng.rand<Key>();

  for (int cr = NO_CASTLING; cr <= ANY_CASTLING; ++cr)
  {
      Zobrist::castling[cr] = 0;
      Bitboard b = cr;
      while (b)
      {
          Key k = Zobrist::castling[Bitboard(1) << pop_lsb(&b)];
          Zobrist::castling[cr] ^= k ? k : rng.rand<Key>();
      }
  }

  Zobrist::side = rng.rand<Key>();
  Zobrist::noPawns = rng.rand<Key>();
}


/// Position::set() initializes the position object with the given FEN string.
/// This function is not very robust - make sure that input FENs are correct,
/// this is assumed to be the responsibility of the GUI.

Position& Position::set(const string& fenStr, StateInfo* si, Thread* th) {
/*
   A FEN string defines a particular position using only the ASCII character set.

   A FEN string contains six fields separated by a space. The fields are:

   1) Piece placement (from white's perspective). Each rank is described, starting
      with rank 8 and ending with rank 1. Within each rank, the contents of each
      square are described from file A through file H. Following the Standard
      Algebraic Notation (SAN), each piece is identified by a single letter taken
      from the standard English names. White pieces are designated using upper-case
      letters ("PNBRQK") whilst Black uses lowercase ("pnbrqk"). Blank squares are
      noted using digits 1 through 8 (the number of blank squares), and "/"
      separates ranks.

   2) Active color. "w" means white moves next, "b" means black.

   3) Castling availability. If neither side can castle, this is "-". Otherwise,
      this has one or more letters: "K" (White can castle kingside), "Q" (White
      can castle queenside), "k" (Black can castle kingside), and/or "q" (Black
      can castle queenside).

   4) En passant target square (in algebraic notation). If there's no en passant
      target square, this is "-". If a pawn has just made a 2-square move, this
      is the position "behind" the pawn. This is recorded only if there is a pawn
      in position to make an en passant capture, and if there really is a pawn
      that might have advanced two squares.

   5) Halfmove clock. This is the number of halfmoves since the last pawn advance
      or capture. This is used to determine if a draw can be claimed under the
      fifty-move rule.

   6) Fullmove number. The number of the full move. It starts at 1, and is
      incremented after Black's move.
*/

  unsigned char col, row, token;
  size_t idx;
  Square sq = SQ_A10;
  std::istringstream ss(fenStr);

  std::memset(this, 0, sizeof(Position));
  std::memset(si, 0, sizeof(StateInfo));
  st = si;

  ss >> std::noskipws;

  // 1. Piece placement
  while ((ss >> token) && !isspace(token))
  {
      if (isdigit(token))
          sq += (token - '0') * EAST; // Advance the given number of files

      else if (token == '/')
          sq += 2 * SOUTH;

      else if ((idx = PieceToChar.find(token)) != string::npos)
      {
          put_piece(Piece(idx), sq);
          ++sq;
      }
  }

  // 2. Active color
  ss >> token;
  sideToMove = (token == 'w' ? WHITE : BLACK);
  ss >> token;

  // 3. Castling availability. Compatible with 3 standards: Normal FEN standard,
  // Shredder-FEN that uses the letters of the columns on which the rooks began
  // the game instead of KQkq and also X-FEN standard that, in case of Chess960,
  // if an inner rook is associated with the castling right, the castling tag is
  // replaced by the file letter of the involved rook, as for the Shredder-FEN.
  while ((ss >> token) && !isspace(token))
  {
      Square rsq;
      Color c = islower(token) ? BLACK : WHITE;
      Piece rook = make_piece(c, ROOK);

      token = char(toupper(token));

      if (token == 'K')
          for (rsq = relative_square(c, SQ_J1); piece_on(rsq) != rook; --rsq) {}

      else if (token == 'Q')
          for (rsq = relative_square(c, SQ_A1); piece_on(rsq) != rook; ++rsq) {}

      else if (token >= 'A' && token <= 'J')
          rsq = make_square(File(token - 'A'), relative_rank(c, RANK_1));

      else
          continue;

      set_castling_right(c, rsq);
  }

  // 3.5 Princess Promotion Rights
  st->princessSquare = SQ_NONE;
  st->princessRights[WHITE] = false;
  st->princessRights[BLACK] = false;

  //check for rights
  while ((ss >> token) && !isspace(token))
  {
      if (token == 'S')
          st->princessRights[WHITE] = true;

      else if (token == 's')
          st->princessRights[BLACK] = true;
  }

  // 4. En passant square. Ignore if no pawn capture is possible
  st->epSquare = SQ_NONE;

  if (   ((ss >> col) && (col >= 'a' && col <= 'j'))
      && ((ss >> row) && (row >= '4' && row <= '7')))
  {
      Square ep = make_square(File(col - 'a'), Rank(row - '1'));
      Bitboard pawns = pieces(sideToMove, PAWN);
      Bitboard attacks = pawn_attacks_bb(sideToMove, pawns);
      Bitboard target = forward_file_bb(sideToMove, ep) & EPRanks;

      if (attacks & target)
      {
          //std::cout << "<set epsquare: " << ep << ">";
          st->epSquare = ep;
      }
  }

  // 5-6. Halfmove clock and fullmove number
  ss >> std::skipws >> st->rule50 >> gamePly;

  // Convert from fullmove starting from 1 to gamePly starting from 0,
  // handle also common incorrect FEN with fullmove = 0.
  gamePly = std::max(2 * (gamePly - 1), 0) + (sideToMove == BLACK);

  thisThread = th;
  set_state(st);

  assert(pos_is_ok());

  return *this;
}


/// Position::set_castling_right() is a helper function used to set castling
/// rights given the corresponding color and the rook starting square.

void Position::set_castling_right(Color c, Square rfrom) {

  Square kfrom = square<KING>(c);
  CastlingRights cr = c & (kfrom < rfrom ? KING_SIDE: QUEEN_SIDE);

  st->castlingRights |= cr;
  castlingRightsMask[kfrom] |= cr;
  castlingRightsMask[rfrom] |= cr;
  castlingRookSquare[cr] = rfrom;

  Square kto = relative_square(c, cr & KING_SIDE ? SQ_H1 : SQ_C1);
  Square rto = relative_square(c, cr & KING_SIDE ? SQ_G1 : SQ_D1);

  castlingPath[cr] =   (between_bb(rfrom, rto) | between_bb(kfrom, kto) | rto | kto)
                    & ~(kfrom | rfrom);
}


/// Position::set_check_info() sets king attacks to detect if a move gives check

void Position::set_check_info(StateInfo* si) const {

  si->blockersForKing[WHITE] = slider_blockers(pieces(BLACK), square<KING>(WHITE), si->pinners[BLACK]);
  si->blockersForKing[BLACK] = slider_blockers(pieces(WHITE), square<KING>(BLACK), si->pinners[WHITE]);

}


/// Position::set_state() computes the hash keys of the position, and other
/// data that once computed is updated incrementally as moves are made.
/// The function is only used when a new position is set up, and to verify
/// the correctness of the StateInfo data when running in debug mode.

void Position::set_state(StateInfo* si) const {

  si->key = si->materialKey = 0;
  si->pawnKey = Zobrist::noPawns;
  si->nonPawnMaterial[WHITE] = si->nonPawnMaterial[BLACK] = VALUE_ZERO;

  //if(!pieces(sideToMove, PRINCE))
      si->checkersBB = attackers_to(square<KING>(sideToMove)) & pieces(~sideToMove);

  set_check_info(si);

  for (Bitboard b = pieces(); b; )
  {
      Square s = pop_lsb(&b);
      Piece pc = piece_on(s);
      si->key ^= Zobrist::psq[pc][s];

      if (type_of(pc) == PAWN)
          si->pawnKey ^= Zobrist::psq[pc][s];

      else if (type_of(pc) != KING)
          si->nonPawnMaterial[color_of(pc)] += PieceValue[MG][pc];
  }

  if (si->epSquare != SQ_NONE)
      si->key ^= Zobrist::enpassant[si->epSquare];

  if (sideToMove == BLACK)
      si->key ^= Zobrist::side;

  si->key ^= Zobrist::castling[si->castlingRights];

  for (Piece pc : Pieces)
      for (int cnt = 0; cnt < pieceCount[pc]; ++cnt)
          si->materialKey ^= Zobrist::psq[pc][cnt];
}


/// Position::set() is an overload to initialize the position object with
/// the given endgame code string like "KBPKN". It is mainly a helper to
/// get the material key out of an endgame code.

Position& Position::set(const string& code, Color c, StateInfo* si) {

  assert(code[0] == 'K');

  string sides[] = { code.substr(code.find('K', 1)),      // Weak
                     code.substr(0, std::min(code.find('v'), code.find('K', 1))) }; // Strong

  assert(sides[0].length() > 0 && sides[0].length() < 8);
  assert(sides[1].length() > 0 && sides[1].length() < 8);

  std::transform(sides[c].begin(), sides[c].end(), sides[c].begin(), tolower);

  string fenStr = "8/" + sides[0] + char(8 - sides[0].length() + '0') + "/8/8/8/8/"
                       + sides[1] + char(8 - sides[1].length() + '0') + "/8 w - - 0 10";

  return set(fenStr, si, nullptr);
}


/// Position::fen() returns a FEN representation of the position. In case of
/// Chess960 the Shredder-FEN notation is used. This is mainly a debugging function.

const string Position::fen() const {

  std::ostringstream ss;

  for (Rank r = RANK_10; r >= RANK_1; --r)
  {
      for (File f = FILE_A; f <= FILE_J; ++f)
      {
          //for (emptyCnt = 0; f <= FILE_J && empty(make_square(f, r)); ++f)
              //++emptyCnt;

          //if (emptyCnt)
              //ss << emptyCnt;
          if (empty(make_square(f, r)))
               ss << '1';

          else if (f <= FILE_J)
              ss << PieceToChar[piece_on(make_square(f, r))];
      }

      if (r > RANK_1)
          ss << '/';
  }

  ss << (sideToMove == WHITE ? " w " : " b ");

  if (can_castle(WHITE_OO))
      ss << ('K');

  if (can_castle(WHITE_OOO))
      ss << ('Q');

  if (can_castle(BLACK_OO))
      ss << ('k');

  if (can_castle(BLACK_OOO))
      ss << ('q');

  if (!can_castle(ANY_CASTLING))
      ss << '-';

  //Princess promotion rights

  ss << ' ';
  if (princess_rights(WHITE))
      ss << 'S';
  if (princess_rights(BLACK))
      ss << 's';

  if (!(princess_rights(WHITE) || princess_rights(BLACK)))
      ss << '-';

  //En passant square
  ss << (ep_square() == SQ_NONE ? " - " : " " + UCI::square(ep_square()) + " ")
     << st->rule50 << " " << 1 + (gamePly - (sideToMove == BLACK)) / 2;

  return ss.str();
}


/// Position::slider_blockers() returns a bitboard of all the pieces (both colors)
/// that are blocking attacks on the square 's' from 'sliders'. A piece blocks a
/// slider if removing that piece from the board would result in a position where
/// square 's' is attacked. For example, a king-attack blocking piece can be either
/// a pinned or a discovered check piece, according if its color is the opposite
/// or the same of the color of the slider.

Bitboard Position::slider_blockers(Bitboard sliders, Square s, Bitboard& pinners) const {

  Bitboard blockers = 0;
  pinners = 0;

  // Snipers are sliders that attack 's' when a piece and other snipers are removed
  Bitboard snipers = (  (attacks_bb<  ROOK>(s) & pieces(QUEEN, ROOK))
                      | (attacks_bb<BISHOP>(s) & pieces(QUEEN, BISHOP))) & sliders;
  Bitboard occupancy = pieces() ^ snipers;

  while (snipers)
  {
    Square sniperSq = pop_lsb(&snipers);
    Bitboard b = between_bb(s, sniperSq) & occupancy;

    if (b && !more_than_one(b))
    {
        blockers |= b;
        if (b & pieces(color_of(piece_on(s))))
            pinners |= sniperSq;
    }
  }

  //check royal pieces straight line attacks
  //snipers = PseudoAttacks[PRINCE][s] & pieces(PRINCE, PRINCESS);
  // This code only works for straight line corner attacks.
  snipers = attacks_bb<PRINCE>(s) & attacks_bb<BISHOP>(s) & pieces(PRINCE, PRINCESS);
  while(snipers)
  {
      Square sniperSq = pop_lsb(&snipers);
      Bitboard b = between_bb(s, sniperSq) & pieces();

      if (b && !more_than_one(b))
      {
          blockers |= b;
          if (b & pieces(color_of(piece_on(s))))
              pinners |= sniperSq;
      }
  }

  // do all of the phalanx blocking (if all three block, all are blockers).
  Bitboard sbb = square_bb(s), wall = 0;

  // NORTH
  if (shift<NORTH+NORTH>(sbb) & pieces(PRINCE, PRINCESS))
  {
      wall = royal_wall(s, s+NORTH + NORTH);
      if (!(wall & ~pieces()))
          blockers |= wall;
  }

  // EAST
  if (shift<EAST+EAST>(sbb) & pieces(PRINCE, PRINCESS))
  {
      wall = royal_wall(s, s+EAST+ EAST);
      if (!(wall & ~pieces()))
          blockers |= wall;
  }

  // SOUTH
  if (shift<SOUTH+SOUTH>(sbb) & pieces(PRINCE, PRINCESS))
  {
      wall = royal_wall(s, s+SOUTH+ SOUTH);
      if (!(wall & ~pieces()))
          blockers |= wall;
  }

  // WEST
  if (shift<WEST+WEST>(sbb) & pieces(PRINCE, PRINCESS))
  {
      wall = royal_wall(s, s+WEST+ WEST);
      if (!(wall & ~pieces()))
          blockers |= wall;
  }

  return blockers;
}


/// Position::attackers_to() computes a bitboard of all pieces which attack a
/// given square. Slider attacks use the occupied bitboard to indicate occupancy.

Bitboard Position::attackers_to(Square s, Bitboard occupied) const {

  return (pawn_attacks_bb(BLACK, s)       & pieces(WHITE, PAWN))
        | (pawn_attacks_bb(WHITE, s)       & pieces(BLACK, PAWN))
        | (attacks_bb<KNIGHT>(s)           & pieces(KNIGHT))
        | (attacks_bb<BISHOP>(s, occupied) & pieces(BISHOP, QUEEN))
        | (attacks_bb<  ROOK>(s, occupied) & pieces(  ROOK, QUEEN))
        | (attacks_bb<PRINCESS>(s, occupied) & pieces(PRINCESS))
        | (attacks_bb<PRINCE>(s, occupied) & pieces(PRINCE))
        | (attacks_bb<KING>(s)             & pieces(KING));
}


/// Position::legal() tests whether a pseudo-legal move is legal

bool Position::legal(Move m) const {

  assert(is_ok(m));

  //std::cout << "<checking move legality: " << from_sq(m) << "," << to_sq(m) << ">";
  //std::cout << std::endl;
  //std::cout << *this;

  Color us = sideToMove;
  Square from = from_sq(m);
  Square to = to_sq(m);
  PieceType pt = type_of(piece_on(from));

  assert(color_of(moved_piece(m)) == us);
  assert(piece_on(square<KING>(us)) == make_piece(us, KING));

  // En passant captures are a tricky special case. Because they are rather
  // uncommon, we do it simply by testing whether the king is attacked after
  // the move is made.
  if (type_of(m) == ENPASSANT)
  {
      Square ksq = square<KING>(us);
      Square capsq = ep_square(); //make_square(file_of(to) , relative_rank(sideToMove, RANK_6));


      //Bitboard eptargets = forward_file_bb(sideToMove, ep_square()) & EPRanks;
      //assert((to == ep_square()) || (to == ep_square() + pawn_push(sideToMove)));

      ////std::cout << "<checking epmove legality: " << from_sq(m) << ","
                                                 //<< to_sq(m) << ">";
      //std::cout << *this << std::endl;
      //assert(eptargets & to);
      assert(moved_piece(m) == make_piece(us, PAWN));
      assert(piece_on(capsq) == make_piece(~us, PAWN));
      assert(piece_on(to) == NO_PIECE);

      Bitboard occupied = (pieces() ^ from ^ capsq) | to;
      return   !(attacks_bb<  ROOK>(ksq, occupied) & pieces(~us, QUEEN, ROOK))
            && !(attacks_bb<BISHOP>(ksq, occupied) & pieces(~us, QUEEN, BISHOP));
  }

  // Castling moves generation does not check if the castling path is clear of
  // enemy attacks, it is delayed at a later time: now!
  //std::cout << "<legal1>" << std::endl;
  if (type_of(m) == CASTLING)
  {
      // After castling, the rook and king final positions are the same in
      // Chess960 as they would be in standard chess.
      to = relative_square(us, to > from ? SQ_H1 : SQ_C1);
      Direction step = to > from ? WEST : EAST;

      for (Square s = to; s != from; s += step)
          if (attackers_to(s) & pieces(~us))
              return false;
  }
  else
  {
      // Illegal if capturing own piece
      if (pieces(us) & to)
          return false;
  }

  // If the king is under attack and this move doesn't attack it, illegal
  Square enemyKsq = square<KING>(~us);
  if (attackers_to(enemyKsq, pieces()) & pieces(us))
  {
      if (to != enemyKsq)
          return false;
  }

  // If the moving piece is a king, check whether the destination square is
  // attacked by the opponent.
  if (!pieces(us, PRINCE))
  {
      if (type_of(piece_on(from)) == KING)
          return !(attackers_to(to, pieces() ^ from) & pieces(~us));
  }

  // Generally, if we move and king is in check, it's not legal
  // This shouldn't be done here, but with blockers, but it's hard with royals.
  // Not sure this works if the to square is a capture of a checking piece?
  //std::cout << "<legal2>" << std::endl;
  if ((!pieces(us, PRINCE)))// && ((pt == PRINCE) || (pt == PRINCESS)))
  {
      Bitboard occupied = (pieces() & ~square_bb(from)) | square_bb(to);
      Bitboard attackers = attackers_to(square<KING>(us), occupied) & pieces(~us) & ~square_bb(to);
      //if ((attackers_to(square<KING>(us), occupied) ^ to) & pieces(~us))
      if (attackers)
      {
          //std::cout << "<ILLEGAL MOVE: " << from << "," << to << ">" <<
              //"<OCCUPIED>" << Bitboards::pretty(occupied) <<
              //"<ATTACKER>" << Bitboards::pretty(attackers);
          return false;
      }
  }

  if (pt == PAWN)
  {
      if (type_of(m) == PROMOTION)
          assert(relative_rank(us, to) == RANK_10);
  }

  // If the captured piece is a queen, and the princess could take the king
  // if promoted (the opponent decides), It's not a legal move.
  //std::cout << "<legal3>" << std::endl;
  if (piece_on(to) == make_piece(~us, QUEEN))
  {
     //std::cout << "<do move: queen captured>" << std::endl;
     if (pieces(~us, PRINCESS))
     {
         //std::cout << "<do move: there is a princess>" << std::endl;
         Square newQueen = square<PRINCESS>(~us);

         Bitboard occupied = (pieces() & ~square_bb(from));
         if (attacks_bb<QUEEN>(newQueen, occupied) & square<KING>(us))
         {
             if (!pieces(us, PRINCE))
             {
                 //std::cout << "<Illegal queen capture.  Puts own king in check and no prince!>" << std::endl;
                 return false;
             }
         }
         //else std::cout << "<king not attacked>" << std::endl;
     }
  }


  //std::cout << "<last test>";
  //If after a move, both kings are in check it's not legal.
  Square ourKsq = square<KING>(us) == from ? to : square<KING>(us);
  Bitboard checkSquares = attacks_bb(pt, square<KING>(~us), pieces());

  // if promotion, add more check squares
  if (type_of(m) == PROMOTION)
      checkSquares |= attacks_bb(promotion_type(m), square<KING>(~us), pieces());

  // Does this move check the other king?
  if (checkSquares & to)
  {
      //Is our KING also in check after the move?
      Bitboard occupied = (pieces() & ~square_bb(from)) | square_bb(to);

      //If the move type is ENPASSANT, also remove the check square
      if (type_of(m) == ENPASSANT)
          occupied &= ~square_bb(ep_square());

      Bitboard theirCheckers = attackers_to(ourKsq, occupied) & pieces(~us) & ~square_bb(to);
      if (theirCheckers)
          return false;
  }

  if (promote_princess(m))
  {
      //std::cout << "<move requested to promote princess>";
      //std::cout << "<queen_captured: " << queen_captured() << ">" << std::endl;
      if (!queen_captured())
      {
          //std::cout << "<illegal move: queen not captured on last move>" << std::endl;
          return false;
      }

      if (!princess_rights(us))
      {
          //std::cout << "<illegal move: requests promotion, but no rights.>" << std::endl;
          return false;
      }
  }
  //else std::cout << "<move does not request princess promotion>" << std::endl;

  // non-royal pieces
  // A non-king move is legal if and only if it is not pinned or it
  // is moving along the ray towards or away from the king.
  //std::cout << "<return default>" << std::endl;
  return   !(blockers_for_king(us) & from)
        ||  aligned(from, to, square<KING>(us));
}


/// Position::pseudo_legal() takes a random move and tests whether the move is
/// pseudo legal. It is used to validate moves from TT that can be corrupted
//
/// due to SMP concurrent access or hash position key aliasing.

bool Position::pseudo_legal(const Move m) const {

  Color us = sideToMove;
  Square from = from_sq(m);
  Square to = to_sq(m);
  Piece pc = moved_piece(m);

  if (promote_princess(m) && !queen_captured())
      return false;

  // Use a slower but simpler function for uncommon cases
  if (type_of(m) != NORMAL)
      return MoveList<LEGAL>(*this).contains(m);

  // Is not a promotion, so promotion piece must be empty
  if (promotion_type(m) - KNIGHT != NO_PIECE_TYPE)
      return false;

  // If the 'from' square is not occupied by a piece belonging to the side to
  // move, the move is obviously not legal.
  if (pc == NO_PIECE || color_of(pc) != us)
      return false;

  // The destination square cannot be occupied by a friendly piece
  if (pieces(us) & to)
      return false;

  // Handle the special case of a pawn move
  if (type_of(pc) == PAWN)
  {
      // We have already handled promotion moves, so destination
      // cannot be on the 8th/1st rank.
      if ((Rank10BB | Rank1BB) & to)
          return false;

      if (   !(pawn_attacks_bb(us, from) & pieces(~us) & to) // Not a capture
          && !((from + pawn_push(us) == to) && empty(to))       // Not a single push
          && !(   (from + 2 * pawn_push(us) == to)              // Not a double push
               && (relative_rank(us, from) == RANK_2)
               && empty(to)
               && empty(to - pawn_push(us))))
          return false;
  }
  else if (!(attacks_bb(type_of(pc), from, pieces()) & to))
      return false;

  // Evasions generator already takes care to avoid some kind of illegal moves
  // and legal() relies on this. We therefore have to take care that the same
  // kind of moves are filtered out here.
  if (checkers())
  {
      if (type_of(pc) != KING)
      {
          // Double check? In this case a king move is required
          if (more_than_one(checkers()))
              return false;

          // Our move must be a blocking evasion or a capture of the checking piece
          if (!((between_bb(lsb(checkers()), square<KING>(us)) | checkers()) & to))
              return false;
      }
      // In case of king moves under check we have to remove king so as to catch
      // invalid moves like b1a1 when opposite queen is on c1.
      else if (attackers_to(to, pieces() ^ from) & pieces(~us))
          return false;
  }

  return true;
}


/// Position::gives_check() tests whether a pseudo-legal move gives a check

bool Position::gives_check(Move m) const {

  assert(is_ok(m));
  assert(color_of(moved_piece(m)) == sideToMove);

  Square from = from_sq(m);
  Square to = to_sq(m);

  // If there is a prince on board, no checks.
  if (pieces(~sideToMove, PRINCE))
      return false;

  // Is there a direct check?
  if (attacks_bb(type_of(piece_on(from)), square<KING>(~sideToMove), pieces()) & to)
      return true;

  // Is there a discovered check?
  if (   (blockers_for_king(~sideToMove) & from)
      && !aligned(from, to, square<KING>(~sideToMove)))
      return true;

  switch (type_of(m))
  {
  case NORMAL:
      return false;

  case PROMOTION:
      return attacks_bb(promotion_type(m), to, pieces() ^ from) & square<KING>(~sideToMove);

  // En passant capture with check? We have already handled the case
  // of direct checks and ordinary discovered check, so the only case we
  // need to handle is the unusual case of a discovered check through
  // the captured pawn.
  case ENPASSANT:
  {
      Square capsq = make_square(file_of(to), rank_of(from));
      Bitboard b = (pieces() ^ from ^ capsq) | to;

      return  (attacks_bb<  ROOK>(square<KING>(~sideToMove), b) & pieces(sideToMove, QUEEN, ROOK))
            | (attacks_bb<BISHOP>(square<KING>(~sideToMove), b) & pieces(sideToMove, QUEEN, BISHOP));
  }
  case CASTLING:
  {
      Square kfrom = from;
      Square rfrom = to; // Castling is encoded as 'king captures the rook'
      Square kto = relative_square(sideToMove, rfrom > kfrom ? SQ_H1 : SQ_C1);
      Square rto = relative_square(sideToMove, rfrom > kfrom ? SQ_G1 : SQ_D1);

      return   (attacks_bb<ROOK>(rto) & square<KING>(~sideToMove))
            && (attacks_bb<ROOK>(rto, (pieces() ^ kfrom ^ rfrom) | rto | kto) & square<KING>(~sideToMove));
  }
  default:
      assert(false);
      return false;
  }
}


/// Position::do_move() makes a move, and saves all information necessary
/// to a StateInfo object. The move is assumed to be legal. Pseudo-legal
/// moves should be filtered out before this function is called.

bool Position::do_move(Move m, StateInfo& newSt, bool givesCheck) {

  assert(is_ok(m));
  assert(&newSt != st);

  bool somethingBAD = false;
  thisThread->nodes.fetch_add(1, std::memory_order_relaxed);
  Key k = st->key ^ Zobrist::side;

  // Copy some fields of the old state to our new StateInfo object except the
  // ones which are going to be recalculated from scratch anyway and then switch
  // our state pointer to point to the new (ready to be updated) state.
  std::memcpy(&newSt, st, offsetof(StateInfo, key));
  newSt.princessSquare= SQ_NONE;
  newSt.previous = st;
  st = &newSt;

  // Increment ply counters. In particular, rule50 will be reset to zero later on
  // in case of a capture or a pawn move.
  ++gamePly;
  ++st->rule50;
  ++st->pliesFromNull;

  Color us = sideToMove;
  Color them = ~us;
  Square from = from_sq(m);
  Square to = to_sq(m);
  Piece pc = piece_on(from);
  Piece captured = type_of(m) == ENPASSANT ? make_piece(them, PAWN) : piece_on(to);

  //std::cout << "LEGAL MOVES: ";
  //for (const auto& m2 : MoveList<LEGAL>(*this))
      //std::cout << "<" << from_sq(m2) << "," << to_sq(m2) << ">";
  //std::cout << std::endl;

  //std::cout << "<move: " << from_sq(m) << "," << to_sq(m) << ">" << *this;
  //std::cout << "<FEN: " << fen() << ">" << std::endl;
  //std::cout << *this;

  //test code
  //if (st->previous->capturedPiece == make_piece(us, QUEEN)) //opponent killed a queen
  //if (queen_captured())
      //m |= Move(1 << 20); //add request to promote princess
      //m = Move(m | (1 << 20));

  assert(color_of(pc) == us);
  assert(captured == NO_PIECE || color_of(captured) == (type_of(m) != CASTLING ? them : us));

  if (!pieces(~us, PRINCE))
  {
      //assert(type_of(captured) != KING);

      if (type_of(captured) == KING)
      {
          std::cout << "<ASSERT FAILED>" << *this
                    << "<move: " << UCI::move(m) << ">" << std::endl;
          std::cout << "<previous move: " << std::hex << st->previous->key << ">";
          somethingBAD = true;
      }
  }

  if (type_of(m) == CASTLING)
  {
      assert(pc == make_piece(us, KING));
      assert(captured == make_piece(us, ROOK));

      Square rfrom, rto;
      do_castling<true>(us, from, to, rfrom, rto);

      k ^= Zobrist::psq[captured][rfrom] ^ Zobrist::psq[captured][rto];
      captured = NO_PIECE;
  }

  if (captured)
  {
      Square capsq = to;

      // If the captured piece is a pawn, update pawn hash key, otherwise
      // update non-pawn material.
      if (type_of(captured) == PAWN)
      {
          if (type_of(m) == ENPASSANT)
          {
              //capsq = make_square(file_of(to), relative_rank(sideToMove, RANK_6));
              capsq = ep_square(); //make_square(file_of(to), relative_rank(sideToMove, RANK_6));

              //Bitboard eptargets = forward_file_bb(us, capsq) & EPRanks;
              assert(pc == make_piece(us, PAWN));
              //assert(eptargets & to);
              //assert((relative_rank(us, to) == RANK_7) ||
                     //(relative_rank(us, to) == RANK_8));
              assert(piece_on(to) == NO_PIECE);
              assert(piece_on(capsq) == make_piece(them, PAWN));
          }

          st->pawnKey ^= Zobrist::psq[captured][capsq];
      }
      else if (type_of(captured) == KING)
      {
          //Promoting the prince
          //std::cout << "<promoting the prince>";
          //std::cout << "<move: " << from_sq(m) << "," << to_sq(m) << ">" << *this;

          assert(pieces(~us, PRINCE)); //illegal move if there is no PRINCE

          Piece newking = make_piece(~us, KING);
          Piece oldPrince = make_piece(~us, PRINCE);
          Square princeSquare = square<PRINCE>(~us);


          remove_piece(princeSquare);
          put_piece(newking, princeSquare);

          // Update hash keys
          k ^= Zobrist::psq[oldPrince][princeSquare] ^ Zobrist::psq[newking][princeSquare];
          st->materialKey ^=  Zobrist::psq[oldPrince][1]
                            ^ Zobrist::psq[oldPrince][0];

          // Update material
          st->nonPawnMaterial[~us] -= PieceValue[MG][PRINCE];
      }
      //else if (type_of(captured) == QUEEN)
      //{
          //std::cout << "<captured queen at: " << to << ">" << *this;
      //}
      else
          st->nonPawnMaterial[them] -= PieceValue[MG][captured];

      //if (type_of(captured) == QUEEN)
          //std::cout << "<taking queen: " << from << "," << to << ">" << *this << std::endl;

      // Update board and piece lists
      remove_piece(capsq);

      if (type_of(m) == ENPASSANT)
          board[capsq] = NO_PIECE;

      // Update material hash key and prefetch access to materialTable
      k ^= Zobrist::psq[captured][capsq];
      st->materialKey ^= Zobrist::psq[captured][pieceCount[captured]];
      //prefetch(thisThread->materialTable[st->materialKey]);

      // Reset rule 50 counter
      st->rule50 = 0;
  }

  //else if (type_of(captured) == QUEEN)
  //if (type_of((st-1)->capturedPiece) == QUEEN) //opponent killed a queen
  //if ((st-1)->capturedPiece == make_piece(us, QUEEN)) //opponent killed a queen
  //if (st->previous->capturedPiece == make_piece(us, QUEEN)) //opponent killed a queen
  //std::cout << "<previous queen captured? " << previous_queen_captured() << ">" << std::endl;
  //if (promote_princess(m))
  if (previous_queen_captured())
  {
      //If we have rights to promote the Princess
      //std::cout << "<move requests to promote princess>" << std::endl;
      //std::cout << "<queen captured: " << queen_captured() << ">" << std::endl;
      if (promote_princess(m) && st->princessRights[us])
      {
          //std::cout << "<princess promotion possible>" << *this << std::endl;
          if (pieces(us, PRINCESS))
          {
              Piece newQueen = make_piece(us, QUEEN);
              Piece oldPrincess = make_piece(us, PRINCESS);
              Square princess = square<PRINCESS>(us);

              // If it doesn't attack the king, or they have a prince,
              // it's OK to promote
              if ((!(attacks_bb<QUEEN>(princess, pieces()) & square<KING>(~us))) ||
                   (pieces(~us, PRINCE)))
              {
                  st->princessSquare = princess;
                  //std::cout << "<promoting princess at: " << st->princessSquare << ">" << std::endl;
                  //std::cout << *this;

                  remove_piece(princess);
                  put_piece(newQueen, princess);

                  // Update hash keys
                  k ^= Zobrist::psq[oldPrincess][princess];
                  k ^= Zobrist::psq[newQueen][princess];
                  st->materialKey ^= Zobrist::psq[oldPrincess][1];
                  st->materialKey ^= Zobrist::psq[oldPrincess][0];

                  // Update material
                  st->nonPawnMaterial[us] -= PieceValue[MG][PRINCESS];
                  st->nonPawnMaterial[us] += PieceValue[MG][QUEEN];

                  //std::cout << "<after promotion: " << *this;
              }
          } //we have a princess
      } //we have rights to promote a princess

      //Regardless of whether we promoted or not, we no longer have the choice
      //std::cout << "< removing promotion rights for: " << us << ">" << std::endl;
      st->princessRights[us] = false;
  }

  // Update hash key
  k ^= Zobrist::psq[pc][from] ^ Zobrist::psq[pc][to];

  // Reset en passant square
  if (st->epSquare != SQ_NONE)
  {
      k ^= Zobrist::enpassant[st->epSquare];
      st->epSquare = SQ_NONE;
  }

  // Reset princess promote square
  //if (st->princessPromote != SQ_NONE)
      //st->princessPromote = SQ_NONE;

  // Update castling rights if needed
  if (st->castlingRights && (castlingRightsMask[from] | castlingRightsMask[to]))
  {
      int cr = castlingRightsMask[from] | castlingRightsMask[to];
      k ^= Zobrist::castling[st->castlingRights & cr];
      st->castlingRights &= ~cr;
  }

  // Move the piece. The tricky Chess960 castling is handled earlier
  if (type_of(m) != CASTLING)
      move_piece(from, to);

  // If the moving piece is a pawn do some special extra work
  if (type_of(pc) == PAWN)
  {
      // Set en-passant square if the moved pawn can be captured
      if (abs(from - to) > (15)) //   (int(to) ^ int(from)) == 24
          //&& ((( pawn_attacks_bb(us, to - pawn_push(us)) & pieces(them, PAWN)))
             //||(pawn_attacks_bb(us, to - pawn_push(us) - pawn_push(us)) & pieces(them, PAWN))))
      {
          //std::cout << "<epmove: " << from << "," << to << ">";
          st->epSquare = to; // - pawn_push(us);
          k ^= Zobrist::enpassant[st->epSquare];
      }

      else if (type_of(m) == PROMOTION)
      {
          Piece promotion = make_piece(us, promotion_type(m));

          assert(relative_rank(us, to) == RANK_10);
          assert(type_of(promotion) >= KNIGHT && type_of(promotion) <= QUEEN);

          remove_piece(to);
          put_piece(promotion, to);

          // Update hash keys
          k ^= Zobrist::psq[pc][to] ^ Zobrist::psq[promotion][to];
          st->pawnKey ^= Zobrist::psq[pc][to];
          st->materialKey ^=  Zobrist::psq[promotion][pieceCount[promotion]-1]
                            ^ Zobrist::psq[pc][pieceCount[pc]];

          // Update material
          st->nonPawnMaterial[us] += PieceValue[MG][promotion];
      }
      //else //normal pawn move
      //{
          //if (relative_rank(us, to) >= RANK_9)
          //{
             //std::cout << "<pawn to rank 10 but NO PROMOTION>" << *this;
             //assert(0);
          //}
      //}

      // Update pawn hash key
      st->pawnKey ^= Zobrist::psq[pc][from] ^ Zobrist::psq[pc][to];

      // Reset rule 50 draw counter
      st->rule50 = 0;
  }

  // Set capture piece
  st->capturedPiece = captured;

  // Update the key with the final value
  st->key = k;

  // Calculate checkers bitboard (if move gives check)
  // Extra careful here, as a PRINCE promotes to a KING and reverts
  st->checkersBB = attackers_to(square<KING>(them)) & pieces(us);

  sideToMove = ~sideToMove;

  // Update king attacks used for fast check detection
  set_check_info(st);

  // Calculate the repetition info. It is the ply distance from the previous
  // occurrence of the same position, negative in the 3-fold case, or zero
  // if the position was not repeated.
  st->repetition = 0;
  int end = std::min(st->rule50, st->pliesFromNull);
  if (end >= 4)
  {
      StateInfo* stp = st->previous->previous;
      for (int i = 4; i <= end; i += 2)
      {
          stp = stp->previous->previous;
          if (stp->key == st->key)
          {
              st->repetition = stp->repetition ? -i : i;
              break;
          }
      }
  }

  //if (st->princessPromote != SQ_NONE)
      //std::cout << "<position after domove>" << *this;

  assert(pos_is_ok());

  return somethingBAD;
}


/// Position::undo_move() unmakes a move. When it returns, the position should
/// be restored to exactly the same state as before the move was made.

void Position::undo_move(Move m) {

  assert(is_ok(m));

  sideToMove = ~sideToMove;

  Color us = sideToMove;
  Square from = from_sq(m);
  Square to = to_sq(m);
  Piece pc = piece_on(to);

  assert(empty(from) || type_of(m) == CASTLING);
  //assert(type_of(st->capturedPiece) != KING);

  if (type_of(st->capturedPiece) == KING)
  {
      //demote the current enemy KING to a PRINCE and put the KING back
      Square princeSquare = square<KING>(~us);

      remove_piece(princeSquare);
      put_piece(make_piece(~us, PRINCE), princeSquare);
  }

  if (type_of(m) == PROMOTION)
  {
      assert(relative_rank(us, to) == RANK_10);
      assert(type_of(pc) == promotion_type(m));
      assert(type_of(pc) >= KNIGHT && type_of(pc) <= QUEEN);

      remove_piece(to);
      pc = make_piece(us, PAWN);
      put_piece(pc, to);
  }

  if (type_of(m) == CASTLING)
  {
      Square rfrom, rto;
      do_castling<false>(us, from, to, rfrom, rto);
  }
  else
  {
      move_piece(to, from); // Put the piece back at the source square

      if (st->capturedPiece)
      {
          Square capsq = to;

          if (type_of(m) == ENPASSANT)
          {
              //capsq = make_square(file_of(to), relative_rank(sideToMove, RANK_6));
              capsq = st->previous->epSquare;

              assert(type_of(pc) == PAWN);
              //assert(to == st->previous->epSquare);
              assert(EPRanks & to);
              assert(piece_on(capsq) == NO_PIECE);
              assert(st->capturedPiece == make_piece(~us, PAWN));
          }


          //std::cout << "<replace ep pawn to: " << capsq << ">";
          put_piece(st->capturedPiece, capsq); // Restore the captured piece
      }
  }

  // Demote princess if necessary
  //if (type_of(st->capturedPiece) == QUEEN)
  //{
     //std::cout << "<a queen was captured>" << std::endl;
     //std::cout << "<" << st->princessPromote << ">" << std::endl;
     if (st->princessSquare != SQ_NONE)
     {
         //Looks like a princess was promoted here, demote her
         Square princessSquare = st->princessSquare;

         //std::cout << "<princess promoted here, demote her: " << princessSquare << ">" << *this;

         assert((type_of(piece_on(princessSquare)) == QUEEN) ||
                (type_of(piece_on(princessSquare)) == PRINCESS));

         if (type_of(piece_on(princessSquare)) == QUEEN)
         {
             //std::cout << "<demoting queen at: " << st->princessPromote << ">" << std::endl;
             //std::cout << *this;

             remove_piece(princessSquare);  // remove the queen
             put_piece(make_piece(us, PRINCESS), princessSquare);
         }

         //assume if princess was demoted, then we had rights, reinstate them
         //std::cout << "<reinstating princess rights for: " << us << ">" << std::endl;
         st->princessRights[us] = true;
     }
  //}


  // Reset princess promote square
  //if (st->princessPromote != SQ_NONE)
  st->princessSquare = SQ_NONE;

  //if (st->princessPromote != SQ_NONE)
      //std::cout << "<position after undomove>" << *this;
  // Finally point our state pointer back to the previous state
  st = st->previous;
  --gamePly;

  assert(pos_is_ok());
}


/// Position::do_castling() is a helper used to do/undo a castling move. This
/// is a bit tricky in Chess960 where from/to squares can overlap.
template<bool Do>
void Position::do_castling(Color us, Square from, Square& to, Square& rfrom, Square& rto) {

  bool kingSide = to > from;
  rfrom = to; // Castling is encoded as "king captures friendly rook"
  rto = relative_square(us, kingSide ? SQ_G1 : SQ_D1);
  to = relative_square(us, kingSide ? SQ_H1 : SQ_C1);

  // Remove both pieces first since squares could overlap in Chess960
  remove_piece(Do ? from : to);
  remove_piece(Do ? rfrom : rto);
  board[Do ? from : to] = board[Do ? rfrom : rto] = NO_PIECE; // Since remove_piece doesn't do this for us
  put_piece(make_piece(us, KING), Do ? to : from);
  put_piece(make_piece(us, ROOK), Do ? rto : rfrom);
}


/// Position::key_after() computes the new hash key after the given move. Needed
/// for speculative prefetch. It doesn't recognize special moves like castling,
/// en-passant and promotions.

Key Position::key_after(Move m) const {

  Square from = from_sq(m);
  Square to = to_sq(m);
  Piece pc = piece_on(from);
  Piece captured = piece_on(to);
  Key k = st->key ^ Zobrist::side;

  if (captured)
      k ^= Zobrist::psq[captured][to];

  return k ^ Zobrist::psq[pc][to] ^ Zobrist::psq[pc][from];
}


/// Position::see_ge (Static Exchange Evaluation Greater or Equal) tests if the
/// SEE value of move is greater or equal to the given threshold. We'll use an
/// algorithm similar to alpha-beta pruning with a null window.

bool Position::see_ge(Move m, Value threshold) const {

  assert(is_ok(m));

  // Only deal with normal moves, assume others pass a simple see
  if (type_of(m) != NORMAL)
      return VALUE_ZERO >= threshold;

  Square from = from_sq(m), to = to_sq(m);

  int swap = PieceValue[MG][piece_on(to)] - threshold;
  if (swap < 0)
      return false;

  swap = PieceValue[MG][piece_on(from)] - swap;
  if (swap <= 0)
      return true;

  Bitboard occupied = pieces() ^ from ^ to;
  Color stm = color_of(piece_on(from));
  Bitboard attackers = attackers_to(to, occupied);
  Bitboard stmAttackers, bb;
  int res = 1;

  while (true)
  {
      stm = ~stm;
      attackers &= occupied;

      // If stm has no more attackers then give up: stm loses
      if (!(stmAttackers = attackers & pieces(stm)))
          break;

      // Don't allow pinned pieces to attack (except the king) as long as
      // there are pinners on their original square.
      if (pinners(~stm) & occupied)
          stmAttackers &= ~blockers_for_king(stm);

      if (!stmAttackers)
          break;

      res ^= 1;

      // Locate and remove the next least valuable attacker, and add to
      // the bitboard 'attackers' any X-ray attackers behind it.
      if ((bb = stmAttackers & pieces(PAWN)))
      {
          if ((swap = PawnValueMg - swap) < res)
              break;

          occupied ^= lsb(bb);
          attackers |= attacks_bb<BISHOP>(to, occupied) & pieces(BISHOP, QUEEN);
      }

      else if ((bb = stmAttackers & pieces(KNIGHT)))
      {
          if ((swap = KnightValueMg - swap) < res)
              break;

          occupied ^= lsb(bb);
      }

      else if ((bb = stmAttackers & pieces(BISHOP)))
      {
          if ((swap = BishopValueMg - swap) < res)
              break;

          occupied ^= lsb(bb);
          attackers |= attacks_bb<BISHOP>(to, occupied) & pieces(BISHOP, QUEEN);
      }

      else if ((bb = stmAttackers & pieces(ROOK)))
      {
          if ((swap = RookValueMg - swap) < res)
              break;

          occupied ^= lsb(bb);
          attackers |= attacks_bb<ROOK>(to, occupied) & pieces(ROOK, QUEEN);
      }

      else if ((bb = stmAttackers & pieces(QUEEN)))
      {
          if ((swap = QueenValueMg - swap) < res)
              break;

          occupied ^= lsb(bb);
          attackers |=  (attacks_bb<BISHOP>(to, occupied) & pieces(BISHOP, QUEEN))
                      | (attacks_bb<ROOK  >(to, occupied) & pieces(ROOK  , QUEEN));
      }

      else // KING
           // If we "capture" with the king but opponent still has attackers,
           // reverse the result.
          return (attackers & ~pieces(stm)) ? res ^ 1 : res;
  }

  return bool(res);
}


/// Position::is_draw() tests whether the position is drawn by 50-move rule
/// or by repetition. It does not detect stalemates.

bool Position::is_draw(int ply) const {

  if (st->rule50 > 99 && (!checkers() || MoveList<LEGAL>(*this).size()))
      return true;

  // Return a draw score if a position repeats once earlier but strictly
  // after the root, or repeats twice before or at the root.
  return st->repetition && st->repetition < ply;
}

/*
bool Position::is_mate(int ply) const {

    Color stm = side_to_move();
    Square ksq = square<KING>(~stm);

    // If the king can be taken, it's mate
    if (attackers_to(ksq, pieces()) & pieces(stm))
        return true;
    
    return false;
}
*/


// Position::has_repeated() tests whether there has been at least one repetition
// of positions since the last capture or pawn move.

bool Position::has_repeated() const {

    StateInfo* stc = st;
    int end = std::min(st->rule50, st->pliesFromNull);
    while (end-- >= 4)
    {
        if (stc->repetition)
            return true;

        stc = stc->previous;
    }
    return false;
}


/// Position::flip() flips position with the white and black sides reversed. This
/// is only useful for debugging e.g. for finding evaluation symmetry bugs.

void Position::flip() {

  string f, token;
  std::stringstream ss(fen());

  for (Rank r = RANK_10; r >= RANK_1; --r) // Piece placement
  {
      std::getline(ss, token, r > RANK_1 ? '/' : ' ');
      f.insert(0, token + (f.empty() ? " " : "/"));
  }

  ss >> token; // Active color
  f += (token == "w" ? "B " : "W "); // Will be lowercased later

  ss >> token; // Castling availability
  f += token + " ";

  std::transform(f.begin(), f.end(), f.begin(),
                 [](char c) { return char(islower(c) ? toupper(c) : tolower(c)); });

  ss >> token; // En passant square
  f += (token == "-" ? token : token.replace(1, 1, token[1] == '3' ? "6" : "3"));

  std::getline(ss, token); // Half and full moves
  f += token;

  set(f, st, this_thread());

  assert(pos_is_ok());
}


/// Position::pos_is_ok() performs some consistency checks for the
/// position object and raises an asserts if something wrong is detected.
/// This is meant to be helpful when debugging.

bool Position::pos_is_ok() const {

  constexpr bool Fast = true; // Quick (default) or full check?

  //std::cout << "<epsquare: " << ep_square() << ">";
  //std::cout << "<color: " << sideToMove << ">";
  //std::cout << "<rank: " << relative_rank(sideToMove, ep_square()) << ">";
  //std::cout << *this;
  //std::cout << std::endl;
  assert(sideToMove == WHITE || sideToMove == BLACK);
  assert(piece_on(square<KING>(WHITE)) == W_KING);
  assert(piece_on(square<KING>(BLACK)) == B_KING);

  if (ep_square() != SQ_NONE)
          assert((relative_rank(sideToMove, ep_square()) == RANK_6) ||
                 (relative_rank(sideToMove, ep_square()) == RANK_7));
      //assert(0 && "pos_is_ok: Default");

  if (Fast)
      return true;

  if (   pieceCount[W_KING] != 1
      || pieceCount[B_KING] != 1
      || attackers_to(square<KING>(~sideToMove)) & pieces(sideToMove))
      assert(0 && "pos_is_ok: Kings");

  if (   pieceCount[W_PRINCE] <= 1 || pieceCount[B_PRINCE] <= 1)
      assert(0 && "pos_is_ok: Princes");

  if (   pieceCount[W_PRINCESS] <= 1 || pieceCount[B_PRINCESS] <= 1)
      assert(0 && "pos_is_ok: Princesses");

  if (   (pieces(PAWN) & (Rank1BB | Rank10BB))
      || pieceCount[W_PAWN] > 8
      || pieceCount[B_PAWN] > 8)
      assert(0 && "pos_is_ok: Pawns");

  if (   (pieces(WHITE) & pieces(BLACK))
      || (pieces(WHITE) | pieces(BLACK)) != pieces()
      || popcount(pieces(WHITE)) > 16
      || popcount(pieces(BLACK)) > 16)
      assert(0 && "pos_is_ok: Bitboards");

  for (PieceType p1 = PAWN; p1 <= KING; ++p1)
      for (PieceType p2 = PAWN; p2 <= KING; ++p2)
          if (p1 != p2 && (pieces(p1) & pieces(p2)))
              assert(0 && "pos_is_ok: Bitboards");

  StateInfo si = *st;
  set_state(&si);
  if (std::memcmp(&si, st, sizeof(StateInfo)))
      assert(0 && "pos_is_ok: State");

  for (Piece pc : Pieces)
  {
      if (   pieceCount[pc] != popcount(pieces(color_of(pc), type_of(pc)))
          || pieceCount[pc] != std::count(board, board + SQUARE_NB, pc))
          assert(0 && "pos_is_ok: Pieces");
  }

  for (Color c : { WHITE, BLACK })
      for (CastlingRights cr : {c & KING_SIDE, c & QUEEN_SIDE})
      {
          if (!can_castle(cr))
              continue;

          if (   piece_on(castlingRookSquare[cr]) != make_piece(c, ROOK)
              || castlingRightsMask[castlingRookSquare[cr]] != cr
              || (castlingRightsMask[square<KING>(c)] & cr) != cr)
              assert(0 && "pos_is_ok: Castling");
      }

  return true;
}
