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

#include <fstream>
#include <iostream>
#include <istream>
#include <vector>

#include "position.h"

using namespace std;

namespace {

const vector<string> Defaults = {
  "rnbskqtbnr/pppppppppp/55/55/55/55/55/55/PPPPPPPPPP/RNBSKQTBNR w KQkq Ss - 0 1",
  "5k4/55/55/55/55/55/55/55/p9/4K5 w - Ss - 0 1",
  "5q4/55/55/55/55/55/55/5k4/55/4K5 w - Ss - 0 1",
  "55/55/55/55/55/55/55/5sk4/55/4K5 w - Ss - 0 1",
  "55/55/55/55/55/55/55/5tk4/55/4K5 w - Ss - 0 1",
  "rnbsk1111r/pppppqtppp/11111ppn11/1111b11111/1111111111/1111111111/1111111111/PPPPPPP111/1111111PPP/RNBSKQTBNR b KQkq Ss - 0 7",
  "11kr1qtbnr/pppspppppp/11np111111/11111b1111/1111111111/1111111111/1111111111/PPPPP11111/11111PPPPP/RNBSKQTBNR w KQ Ss - 1 6",
  "qqqk6/55/55/55/55/55/55/55/55/5KT3 b - Ss - 0 1",
  "rnbskqtbnr/1111111111/11S1111111/1111111111/1111111111/1111111111/1111111111/1111111111/PPPPPPPPPP/RNB1KQTBNR w KQkq Ss - 0 1",
  "k8q/55/55/55/PPP7/55/55/55/55/KQ8 w - Ss - 0 1",
  "4skq3/55/55/55/37/55/55/55/55/4SKQ3 w - Ss - 0 1",
};

} // namespace

/// setup_bench() builds a list of UCI commands to be run by bench. There
/// are five parameters: TT size in MB, number of search threads that
/// should be used, the limit value spent for each position, a file name
/// where to look for positions in FEN format and the type of the limit:
/// depth, perft, nodes and movetime (in millisecs).
///
/// bench -> search default positions up to depth 13
/// bench 64 1 15 -> search default positions up to depth 15 (TT = 64MB)
/// bench 64 4 5000 current movetime -> search current position with 4 threads for 5 sec
/// bench 64 1 100000 default nodes -> search default positions for 100K nodes each
/// bench 16 1 5 default perft -> run a perft 5 on default positions

vector<string> setup_bench(const Position& current, istream& is) {

  vector<string> fens, list;
  string go, token;

  // Assign default values to missing arguments
  string ttSize    = (is >> token) ? token : "16";
  string threads   = (is >> token) ? token : "1";
  string limit     = (is >> token) ? token : "13";
  string fenFile   = (is >> token) ? token : "default";
  string limitType = (is >> token) ? token : "depth";

  go = limitType == "eval" ? "eval" : "go " + limitType + " " + limit;

  if (fenFile == "default")
      fens = Defaults;

  else if (fenFile == "current")
      fens.push_back(current.fen());

  else
  {
      string fen;
      ifstream file(fenFile);

      if (!file.is_open())
      {
          cerr << "Unable to open file " << fenFile << endl;
          exit(EXIT_FAILURE);
      }

      while (getline(file, fen))
          if (!fen.empty())
              fens.push_back(fen);

      file.close();
  }

  list.emplace_back("setoption name Threads value " + threads);
  list.emplace_back("setoption name Hash value " + ttSize);
  list.emplace_back("ucinewgame");

  for (const string& fen : fens)
      if (fen.find("setoption") != string::npos)
          list.emplace_back(fen);
      else
      {
          list.emplace_back("position fen " + fen);
          list.emplace_back(go);
      }

  return list;
}
