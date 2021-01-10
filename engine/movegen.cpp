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

#include <cassert>

#include "movegen.h"
#include "position.h"
#include "uci.h"

namespace {

  template<GenType Type, Direction D>
  ExtMove* make_promotions(ExtMove* moveList, Square to, Square ksq) {

      //if (!((Rank1BB | Rank10BB) & to))
          //std::cout << "<making broken promotion>";

    if (Type == CAPTURES || Type == EVASIONS || Type == NON_EVASIONS)
    {
        //std::cout << "<adding promotion move: " << (to - D) << "," << to << ">" << std::endl;
        *moveList++ = make<PROMOTION>(to - D, to, QUEEN);
    }

    if (Type == QUIETS || Type == EVASIONS || Type == NON_EVASIONS)
    {
        *moveList++ = make<PROMOTION>(to - D, to, ROOK);
        *moveList++ = make<PROMOTION>(to - D, to, BISHOP);
        *moveList++ = make<PROMOTION>(to - D, to, KNIGHT);
    }

    // Knight promotion is the only promotion that can give a direct check
    // that's not already included in the queen promotion.
    if (Type == QUIET_CHECKS && (attacks_bb<KNIGHT>(to) & ksq))
        *moveList++ = make<PROMOTION>(to - D, to, KNIGHT);
    else
        (void)ksq; // Silence a warning under MSVC

    return moveList;
  }


  template<Color Us, GenType Type>
  ExtMove* generate_pawn_moves(const Position& pos, ExtMove* moveList, Bitboard target) {

    constexpr Color     Them     = ~Us;
    constexpr Bitboard  TRank9BB = (Us == WHITE ? Rank9BB    : Rank2BB);
    constexpr Bitboard  TRank3BB = (Us == WHITE ? Rank3BB    : Rank8BB);
    constexpr Bitboard  TRank4BB = (Us == WHITE ? Rank4BB    : Rank7BB);
    constexpr Direction Up       = pawn_push(Us);
    constexpr Direction UpRight  = (Us == WHITE ? NORTH_EAST : SOUTH_WEST);
    constexpr Direction UpLeft   = (Us == WHITE ? NORTH_WEST : SOUTH_EAST);

    const Square ksq = pos.square<KING>(Them);
    Bitboard emptySquares;

    Bitboard pawnsOn9    = pos.pieces(Us, PAWN) &  TRank9BB;
    Bitboard pawnsNotOn9 = AllSquares & pos.pieces(Us, PAWN) & ~TRank9BB;

    Bitboard enemies = (Type == EVASIONS ? pos.pieces(Them) & target:
                        Type == CAPTURES ? target : pos.pieces(Them));

    // pawn pushes, no promotions
    if (Type != CAPTURES)
    {
        emptySquares = AllSquares & (Type == QUIETS || Type == QUIET_CHECKS ? target : ~pos.pieces());

        Bitboard b1 = shift<Up>(pawnsNotOn9)   & emptySquares;
        Bitboard b2 = shift<Up>(b1 & (TRank3BB | TRank4BB)) & emptySquares;
        Bitboard b3 = shift<Up>(b2 & TRank4BB) & emptySquares;

        if (Type == EVASIONS) // Consider only blocking squares
        {
            b1 &= target;
            b2 &= target;
            b3 &= target;
        }

        if (Type == QUIET_CHECKS)
        {
            b1 &= pawn_attacks_bb(Them, ksq);
            b2 &= pawn_attacks_bb(Them, ksq);
            b3 &= pawn_attacks_bb(Them, ksq);

            // Add pawn pushes which give discovered check. This is possible only
            // if the pawn is not on the same file as the enemy king, because we
            // don't generate captures. Note that a possible discovery check
            // promotion has been already generated amongst the captures.
            Bitboard dcCandidateQuiets = pos.blockers_for_king(Them) & pawnsNotOn9;
            if (dcCandidateQuiets)
            {
                Bitboard dc1 = shift<Up>(dcCandidateQuiets) & emptySquares & ~file_bb(ksq);
                Bitboard dc2 = shift<Up>(dc1 & TRank3BB) & emptySquares;
                Bitboard dc3 = shift<Up>(dc2 & TRank4BB) & emptySquares;

                b1 |= dc1;
                b2 |= dc2;
                b3 |= dc3;
            }
        }

        while (b1)
        {
            Square to = pop_lsb(&b1);
            *moveList++ = make_move(to - Up, to);
        }

        while (b2)
        {
            Square to = pop_lsb(&b2);
            *moveList++ = make_move(to - Up - Up, to);
        }

        while (b3)
        {
            Square to = pop_lsb(&b3);
            *moveList++ = make_move(to - Up - Up - Up, to);
        }
    }

    // Promotions and underpromotions
    if (pawnsOn9)
    {
        if (Type == CAPTURES)
            emptySquares = AllSquares & ~pos.pieces();

        if (Type == EVASIONS)
            emptySquares &= target;

        Bitboard b1 = shift<UpRight>(pawnsOn9) & enemies;
        Bitboard b2 = shift<UpLeft >(pawnsOn9) & enemies;
        Bitboard b3 = shift<Up     >(pawnsOn9) & emptySquares;

        while (b1)
            moveList = make_promotions<Type, UpRight>(moveList, pop_lsb(&b1), ksq);

        while (b2)
            moveList = make_promotions<Type, UpLeft >(moveList, pop_lsb(&b2), ksq);

        while (b3)
            moveList = make_promotions<Type, Up     >(moveList, pop_lsb(&b3), ksq);
    }

    // Standard and en-passant captures
    if (Type == CAPTURES || Type == EVASIONS || Type == NON_EVASIONS)
    {
        Bitboard b1 = shift<UpRight>(pawnsNotOn9) & enemies;
        Bitboard b2 = shift<UpLeft >(pawnsNotOn9) & enemies;

        while (b1)
        {
            Square to = pop_lsb(&b1);
            *moveList++ = make_move(to - UpRight, to);
        }

        while (b2)
        {
            Square to = pop_lsb(&b2);
            *moveList++ = make_move(to - UpLeft, to);
        }

        if (pos.ep_square() != SQ_NONE)
        {
            assert((rank_of(pos.ep_square()) == relative_rank(Us, RANK_6)) ||
                   (rank_of(pos.ep_square()) == relative_rank(Us, RANK_7)));

            // An en passant capture can be an evasion only if the checking piece
            // is the double pushed pawn and so is in the target. Otherwise this
            // is a discovery check and we are forced to do otherwise.
            if (Type == EVASIONS && !(target & (pos.ep_square())))
                return moveList;

            Bitboard eptargets = forward_file_bb(Us, pos.ep_square()) & EPRanks;

            while(eptargets)
            {
                Square sq = pop_lsb(&eptargets);
                b1 = pawnsNotOn9 & pawn_attacks_bb(Them, sq);

                while (b1)
                {
                    Square from = pop_lsb(&b1);
                    *moveList++ = make<ENPASSANT>(from, sq);
                }
            }
        }
    }

    return moveList;
  }


  template<Color Us, PieceType Pt, bool Checks>
  ExtMove* generate_moves(const Position& pos, ExtMove* moveList, Bitboard target) {

    static_assert(Pt != KING && Pt != PAWN, "Unsupported piece type in generate_moves()");

    Bitboard squares = pos.pieces(Us, Pt);

    while(squares)
    {
        Square from = pop_lsb(&squares);
        if (Checks)
        {
            //Don't add moves from this piece if it can't stop the check.
            if (    (Pt == BISHOP || Pt == ROOK || Pt == QUEEN)
                //&& !(attacks_bb<Pt>(from) & target & pos.check_squares(Pt)))
                && !(attacks_bb<Pt>(from) & target & attacks_bb<Pt>(pos.square<KING>(~Us), pos.pieces())))
                continue;

            //don't add moves from this piece if it is pinned
            if (pos.blockers_for_king(~Us) & from)
                continue;
        }

        Bitboard b = attacks_bb<Pt>(from, pos.pieces()) & target;

        if (Checks)
        {
            //b &= pos.check_squares(Pt);
            b &= attacks_bb<Pt>(pos.square<KING>(~Us), pos.pieces());
        }

        while (b)
        {
            *moveList++ = make_move(from, pop_lsb(&b));
        }
    }

    return moveList;
  }


  template<Color Us, GenType Type>
  ExtMove* generate_all(const Position& pos, ExtMove* moveList) {
    constexpr bool Checks = Type == QUIET_CHECKS; // Reduce template instantations
    Bitboard target;

    switch (Type)
    {
        case CAPTURES:
            //std::cout << "<CAPTURES>";
            target =  pos.pieces(~Us);
            break;
        case QUIETS:
        case QUIET_CHECKS:
        {
            //std::cout << "<QUIETS or QUIET_CHECKS>";
            target = AllSquares & ~pos.pieces();
            break;
        }
        case EVASIONS:
        {
            //std::cout << "<EVASIONS>";
            Square checksq = lsb(pos.checkers());
            Square ksq = pos.square<KING>(Us);
            //target = between_bb(pos.square<KING>(Us), checksq) | checksq;
            target = square_bb(checksq);

            //if (pos.pieces(KNIGHT) & checksq)
                //target = square_bb(checksq);
            if (pos.pieces(BISHOP, ROOK) & checksq)
                target |= between_bb(ksq, checksq);
            else if (pos.pieces(QUEEN) & checksq)
                target |= between_bb(ksq, checksq);
            else if (pos.pieces(PRINCE, PRINCESS) & checksq)
            {
                if (attacks_bb<BISHOP>(checksq) & ksq) //corner attack
                    target |= between_bb(ksq, checksq) | checksq;

                else if(distance(checksq, ksq) == 2) //
                {
                    Bitboard wall = royal_wall(checksq, ksq);
                    Bitboard openblocks = wall & ~pos.pieces();

                    // If all are blocked, there shouldn't even be a check
                    assert(openblocks);

                    // If more than one block is missing, can't help
                    if (!more_than_one(wall & ~pos.pieces()))
                    {
                        target |= openblocks;
                    }
                }
            }

            //std::cout << "<OUTPUT TARGETS in EVASIONS: " << checksq << ">" << pos
                      //<< Bitboards::pretty(target);

            break;
        }
        case NON_EVASIONS:
        {
            //std::cout << "<NON_EVASIONS>";
            target = AllSquares & ~pos.pieces(Us);
            break;
        }
        default:
            static_assert(true, "Unsupported type in generate_all()");
    }

    ExtMove *startMoves = moveList;

    moveList = generate_pawn_moves<Us, Type>(pos, moveList, target);
    moveList = generate_moves<Us, KNIGHT, Checks>(pos, moveList, target);
    moveList = generate_moves<Us, BISHOP, Checks>(pos, moveList, target);
    moveList = generate_moves<Us,   ROOK, Checks>(pos, moveList, target);
    moveList = generate_moves<Us, PRINCESS, Checks>(pos, moveList, target);
    moveList = generate_moves<Us, PRINCE, Checks>(pos, moveList, target);
    moveList = generate_moves<Us,  QUEEN, Checks>(pos, moveList, target);

    if (Type != QUIET_CHECKS && Type != EVASIONS)
    {
        Square ksq = pos.square<KING>(Us);
        Bitboard b = attacks_bb<KING>(ksq) & target;
        while (b)
            *moveList++ = make_move(ksq, pop_lsb(&b));

        if ((Type != CAPTURES) && pos.can_castle(Us & ANY_CASTLING))
            for(CastlingRights cr : { Us & KING_SIDE, Us & QUEEN_SIDE } )
                if (!pos.castling_impeded(cr) && pos.can_castle(cr))
                {
                    //std::cout << "<adding castling move: "
                              //<< ksq << "," << pos.castling_rook_square(cr) << ">";
                    *moveList++ = make<CASTLING>(ksq, pos.castling_rook_square(cr));
                }
    }

    ExtMove * endMoves = moveList;

    // Check if the enemy king was attacked. . If so, remove all non-king att
    bool kingAttacked = pos.attackers_to(pos.square<KING>(~Us), pos.pieces()) & pos.pieces(Us);

    if (kingAttacked) //remove all non-king attack moves
    {
        //std::cout << "<king attacked: remove some moves.>" << std::endl;
        for(ExtMove* ml = startMoves; ml < moveList; ml++)
        {
            Move m = ml->move;
            if (to_sq(m) != pos.square<KING>(~Us))
            {
                //std::cout << "<removing: " << UCI::move(m);
                *ml = (--moveList)->move;
            }
        }
    }

    // If the queen was just captured, and we have a princess, there are more
    // moves
    if (pos.queen_captured() && pos.pieces(Us, PRINCESS))
    {
        Square princessSquare = pos.square<PRINCESS>(Us);
        //duplicate all moves and add the queen promotion to them.
        //except the ones from the princess square
        for(ExtMove* ml = startMoves; ml < endMoves; ml++)
        {
            Move m = ml->move;
            if (from_sq(m) != princessSquare)
                *moveList++ = Move(m | (1 << 20));
        }

        //Now, add all moves than the new queen could do (with promotion)
        if (Checks)
        {
            //Don't add moves from this new queen if it can't stop the check.
            if (!(attacks_bb<QUEEN>(princessSquare) & target & attacks_bb<QUEEN>(pos.square<KING>(~Us), pos.pieces())))
                return moveList;
   
            //don't add moves from this new queen if it is pinned
            if (pos.blockers_for_king(~Us) & princessSquare)
                return moveList;
        }
  
        Bitboard b = attacks_bb<QUEEN>(princessSquare, pos.pieces()) & target;
 
        if (Checks)
        {
            //b &= pos.check_squares(QUEEN);
            b &= attacks_bb<QUEEN>(pos.square<KING>(~Us), pos.pieces());
        }

        while (b)
        {
            *moveList++ = make_move(princessSquare, pop_lsb(&b), true); //true = promote princess
        }

        //std::cout << "<Added moves for princess promotion>";

        //for(ExtMove *em = startMoves; em < moveList; em++)
            //std::cout << "<" << UCI::move(em->move) << ">" << std::endl;
        //std::cout << "<END>";
    }

    return moveList;
  }

} // namespace


/// <CAPTURES>     Generates all pseudo-legal captures and queen promotions
/// <QUIETS>       Generates all pseudo-legal non-captures and underpromotions
/// <NON_EVASIONS> Generates all pseudo-legal captures and non-captures
///
/// Returns a pointer to the end of the move list.

template<GenType Type>
ExtMove* generate(const Position& pos, ExtMove* moveList) {

  static_assert(Type == CAPTURES || Type == QUIETS || Type == NON_EVASIONS, "Unsupported type in generate()");
  assert(!pos.checkers());

  Color us = pos.side_to_move();

  return us == WHITE ? generate_all<WHITE, Type>(pos, moveList)
                     : generate_all<BLACK, Type>(pos, moveList);
}

// Explicit template instantiations
template ExtMove* generate<CAPTURES>(const Position&, ExtMove*);
template ExtMove* generate<QUIETS>(const Position&, ExtMove*);
template ExtMove* generate<NON_EVASIONS>(const Position&, ExtMove*);


/// generate<QUIET_CHECKS> generates all pseudo-legal non-captures and knight
/// underpromotions that give check. Returns a pointer to the end of the move list.
template<>
ExtMove* generate<QUIET_CHECKS>(const Position& pos, ExtMove* moveList) {

  assert(!pos.checkers());

  Color us = pos.side_to_move();
  Bitboard dc = pos.blockers_for_king(~us) & pos.pieces(us) & ~pos.pieces(PAWN);

  while (dc)
  {
     Square from = pop_lsb(&dc);
     PieceType pt = type_of(pos.piece_on(from));

     Bitboard b = attacks_bb(pt, from, pos.pieces()) & ~pos.pieces();

     if (pt == KING)
         b &= ~attacks_bb<QUEEN>(pos.square<KING>(~us));

     while (b)
         *moveList++ = make_move(from, pop_lsb(&b));
  }

  return us == WHITE ? generate_all<WHITE, QUIET_CHECKS>(pos, moveList)
                     : generate_all<BLACK, QUIET_CHECKS>(pos, moveList);
}


/// generate<EVASIONS> generates all pseudo-legal check evasions when the side
/// to move is in check. Returns a pointer to the end of the move list.
template<>
ExtMove* generate<EVASIONS>(const Position& pos, ExtMove* moveList) {

  assert(pos.checkers());

  Color us = pos.side_to_move();
  Square ksq = pos.square<KING>(us);
  Bitboard sliderAttacks = 0;

  Bitboard sliders = pos.checkers() & ~pos.pieces(KNIGHT, PAWN);
  //Bitboard sliders = pos.checkers() & (pos.pieces(ROOK) | pos.pieces(BISHOP) | pos.pieces(QUEEN));
  //Bitboard sliders = pos.checkers() & ~(pos.pieces(KNIGHT, PAWN) | pos.pieces(PRINCE, PRINCESS));

  // Find all the squares attacked by slider checkers. We will remove them from
  // the king evasions in order to skip known illegal moves, which avoids any
  // useless legality checks later on.
  //if (!pos.pieces(us, PRINCE))
      while (sliders)
          sliderAttacks |= line_bb(ksq, pop_lsb(&sliders)) & ~pos.checkers();

  // Generate evasions for king, capture and non capture moves
  Bitboard b = attacks_bb<KING>(ksq) & ~pos.pieces(us) & ~sliderAttacks;
  while (b)
      *moveList++ = make_move(ksq, pop_lsb(&b));

  if (more_than_one(pos.checkers()))
  {
      //std::cout << "<DOUBLE CHECK>" << std::endl;
      return moveList; // Double check, only a king move can save the day
  }

  // Generate blocking evasions or captures of the checking piece
  return us == WHITE ? generate_all<WHITE, EVASIONS>(pos, moveList)
                     : generate_all<BLACK, EVASIONS>(pos, moveList);
}


/// generate<LEGAL> generates all the legal moves in the given position

template<>
ExtMove* generate<LEGAL>(const Position& pos, ExtMove* moveList) {

  Color us = pos.side_to_move();
  Square theirKing = pos.square<KING>(~us);
  ExtMove *cur = moveList, *cur2 = moveList, *startMoves = moveList;
  bool kingAttacked = pos.attackers_to(pos.square<KING>(~us), pos.pieces()) & pos.pieces(us);

  moveList = pos.checkers() ? generate<EVASIONS    >(pos, moveList)
                            : generate<NON_EVASIONS>(pos, moveList);
  while (cur != moveList)
  {
      if (!pos.legal(*cur))
          *cur = (--moveList)->move;
      else
          ++cur;
  }

  // If a move attacks the enemy king (regardless of prince), other moves are
  // not legal and are removed from the list.
  if (kingAttacked)
  {
      while (cur2 != moveList)
          if (to_sq(*cur2) != theirKing)
              *cur2 = (--moveList)->move;
          else
              ++cur2;
  }

  // if the princess can promote to a queen, add those moves
  if (pos.queen_captured() && pos.pieces(us, PRINCESS))
  {
      Square princessSquare = pos.square<PRINCESS>(us);
      ExtMove* endMoves = moveList;

      //duplicate all moves and add the queen promotion to them.
      //except the ones from the princess square
      for(ExtMove* ml = startMoves; ml < endMoves; ml++)
      {
          Move m = ml->move;
          if (from_sq(m) != princessSquare)
              *moveList++ = Move(m | (1 << 20));
      }
  }

  return moveList;
}
