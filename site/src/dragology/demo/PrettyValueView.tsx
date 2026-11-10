import { PrettyPrint } from "@joshuahhh/pretty-print";
import { ValueViewProps } from "../ValueView";

/** Shows values in the site's debug views with @joshuahhh/pretty-print. */
export function PrettyValueView(props: ValueViewProps) {
  return props.kind === "state" ? (
    <PrettyPrint
      value={props.value}
      precision={2}
      style={{ fontSize: "11px" }}
      niceId={false}
      niceType={false}
    />
  ) : (
    <PrettyPrint value={props.value} />
  );
}
