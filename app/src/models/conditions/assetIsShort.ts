import { ConditionEnum } from "../../utils/enums";
import AbstractCondition, { IsConditionTrue } from "./abstract";

class PositionIsShortCondition extends AbstractCondition {
  public description = "Asset is sold to open";
  public example = "If this position is sold to open, ...";
  public type = ConditionEnum.PositionIsShort;

  constructor() {
    super({ type: ConditionEnum.PositionIsShort });
  }

  public toString() {
    const supes = super.toString();
    return `${supes} | This position is sold to open`;
  }

  public async isTrue(args: IsConditionTrue): Promise<boolean> {
    const { position } = args;

    return Promise.resolve(position && position.quantity < 0);
  }
}

export default PositionIsShortCondition;
