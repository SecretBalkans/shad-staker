const X_AUTO_WIDTH_CHAR_WIDTHS_KEY = "X_AUTO_WIDTH_CHAR_WIDTHS_KEY";
export function getAutoWidth(text: string) {
  const widths = JSON.parse(window.localStorage.getItem(X_AUTO_WIDTH_CHAR_WIDTHS_KEY) || "{}");
  return [...text.toString()].reduce((total, char) => {
    if (!widths[char]) {
      const span = document.createElement("span");
      span.append(document.createTextNode(char));
      span.style.display = "inline-block";
      document.body.append(span);
      const offsetWidth = span.offsetWidth;
      span.remove();
      widths[char] = offsetWidth;
      window.localStorage.setItem(X_AUTO_WIDTH_CHAR_WIDTHS_KEY, JSON.stringify(widths));
    }
    return widths[char] + total;
  }, 0);
}
export function addCommas(nStr: string | number) {
  const x = (nStr + "").split(".");
  let x1 = x[0];
  const x2 = x.length > 1 ? "." + x[1] : "";
  const rgx = /(\d+)(\d{3})/;
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, "$1" + "," + "$2");
  }
  return x1 + x2;
}

export function prettyNumber(number?: number, fractionDigits = 2, largeNumbersFractionDigits = 2, recursive = true): string {
  if (number) {
    if (Number.isNaN(+number)) {
      return "" + number;
    }
    if (Number.isFinite(+number)) {
      number = +number;
      return addCommas(
        number > 10000
          ? recursive
            ? `${prettyNumber(number / 1000, fractionDigits, largeNumbersFractionDigits, true)}K`
            : number
          : number > 1000
          ? number.toFixed(largeNumbersFractionDigits)
          : number.toFixed(fractionDigits)
      );
    } else {
      return "" + number;
    }
  } else {
    return "0";
  }
}
