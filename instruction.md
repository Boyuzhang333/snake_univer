# 功能说明（3-Arrival_correction 当前实现）

- **蛇类型**
  - `SnakePlus`：吃到食物会成长；长度不足 8 先加环节，之后增大半径（头与身体同步更新）。可吃比自己头部半径小的蛇并成长。
  - `SnakeWanderPlus`：在行为封装的 `behave(snakes, foods, target, radius)` 中：
    - 优先在 `radius`（默认 200px）内寻找体型更小的蛇并追逐；
    - 若范围内无小蛇，再找范围内最近食物；找到则追食物；
    - 若都没有，则执行 wander。
    - 调试模式 (`Vehicle.debug=true`) 会在目标旁显示标签（小蛇 `S<索引>`、食物 `F<索引>`），并在头部画出探测圆。

- **食物**
  - 生成位置限制在画布内距边界 50px 的区域：`creerFoodAleatoire()`。
  - 被蛇头与食物半径之和触碰即被吃掉并替换新食物。

- **wander 调试**
  - 在 `vehicle.js` 的 `wander()` 中，当 `Vehicle.debug=true` 时显示：前方红点（圆心）、白色游走圆、绿色目标点、黄色连线。
  - 调试开关：按键 `d` 切换。

- **渲染流程概要（draw）**
  1. 清屏。
  2. 遍历所有蛇：计算带偏移的目标；`SnakeWanderPlus` 调用 `behave`，其他蛇 `move`；绘制；处理吃食物、吃小蛇。
  3. 绘制食物。
  4. 更新目标为鼠标位置并绘制红点。

- **快捷键**
  - `d`：切换调试模式（显示 wander 及探测圆/目标标签）。
  - `a`：生成一条随机大小与颜色的 `SnakeWanderPlus`。

