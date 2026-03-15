import { registerEnsTokenHandlers } from "./handlers/ensToken.js";
import { registerEnsGovernorHandlers } from "./handlers/ensGovernor.js";
import { registerHedgeyVestingHandlers } from "./handlers/hedgeyVesting.js";
import { registerMultiDelegateHandlers } from "./handlers/multiDelegate.js";

registerMultiDelegateHandlers();
registerHedgeyVestingHandlers();
registerEnsTokenHandlers();
registerEnsGovernorHandlers();
