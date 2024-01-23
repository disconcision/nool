import * as Settings from "./Settings";

const to_singlechar = (emoji: string): string => {
  switch (emoji) {
    case "☁️":
      return "L";
    case "🍄":
      return "M";
    case "🎲":
      return "D";
    case "🦠":
      return "V";
    case "🐝":
      return "E";
    case "♫":
      return "A";
    case "♥":
      return "B";
    case "✿":
      return "C";
    case "🌘":
      return "1";
    case "🌑":
      return "0";
    case "➕":
      return "+";
    case "➖":
      return "-";
    case "✖️":
      return "*";
    default:
      return "?";
  }
};

export const get = (symbols: Settings.symbols, symbol: string):string => {
  switch (symbols) {
    case "Emoji":
      return symbol;
    case "SingleChar":
      return to_singlechar(symbol);
    default:
      return symbol;
  }
};
