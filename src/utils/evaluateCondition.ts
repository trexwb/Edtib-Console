import * as math from 'mathjs'
/**
 * 条件表达式解析器
 * @param {string} condition - 原始条件表达式
 * @returns {boolean} 条件计算结果
 * 实现逻辑：
 * 1. 构建变量上下文（包含parameters和表单值）
 * 2. 替换表达式中的运算符（≤→<=，≥→>=，&→&&，|→||）
 * 3. 通过eval执行表达式（注意安全风险）
 */
export const evaluateConditionDefault = (condition: string, parameters: any, queryForm: any): boolean => {
  const parsedCondition = evaluateConditionFormula(condition, parameters, queryForm);
  // console.log('parsedCondition:', `${parsedCondition}`, eval(parsedCondition))
  try {
    // return math.evaluate(parsedCondition, variables);
    return evaluateExpression(parsedCondition); // eval 收敛至 evaluateExpression 单点（白名单受控）
  } catch (error) {
    console.error(`Error evaluating ${condition}:`, error);
    return false;
  }
}

export const toHalfWidth = (str: string) => {
  return str.replace(/[\uff10-\uff5e]/g, function (char) {
    return String.fromCharCode(char.charCodeAt(0) - 65248);
  }).replace(/\u3000/g, ' '); // 全角空格转换为半角空格
}

export const evaluateConditionFormula = (condition: string, parameters: any, queryForm: any) => {
  const variables = Object.fromEntries(
    Object.entries(parameters[queryForm.mon])
      .filter(([key, value]) => typeof value === 'string' || typeof value === 'number')
      .map(([key, value]) => [key, parseFloat(String(value)) || value]) // 转换为数字（如果可能）
  );
  variables['L'] = queryForm.diameterLength || 0;
  variables['P'] = queryForm.pitch || variables['P'] || 0;
  // const { L, d } = variables;
  const parsedCondition = condition
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/&/g, '&&')
    .replace(/\|/g, '||')
    .replace(/./g, (char) => toHalfWidth(char))
    .replace(/([a-zA-Z]+)/g, (match) => String(variables[match]));

  return parsedCondition;
}

/**
 * 受控布尔表达式求值（C-C2: 移除 eval，改为 mathjs 受限求值）
 * 仅放行「数字/空白/比较与逻辑运算符」，拒绝任何字母、引号、分号等可执行 JS 片段；
 * 将 JS 逻辑运算符翻译为 mathjs 语法后求值，表达式非法或超长时直接返回 false。
 */
export const evaluateExpression = (expr: string): boolean => {
  if (typeof expr !== 'string' || expr.length > 512) {
    return false;
  }
  if (!/^[\d\s.+\-*/%<>=!&|()]*$/.test(expr)) {
    console.error('[evaluateExpression] 拒绝执行非白名单表达式:', expr);
    return false;
  }
  try {
    // 翻译为 mathjs 语法：&& → and，|| → or，前缀 ! → not（!= 保持原样）
    const mathExpr = expr
      .replace(/&&/g, ' and ')
      .replace(/\|\|/g, ' or ')
      .replace(/!(?!=)/g, ' not ')
    return !!math.evaluate(mathExpr, {});
  } catch (error) {
    console.error('[evaluateExpression] 表达式计算失败:', expr, error);
    return false;
  }
};

export const evaluateFormula = (columnar: string, formulas: any, variables: any) => {
  /**
   * 使用公式表批量替换目标字符串中的公式标识符
   * @param acc 累加器 - 存储当前替换结果的中间字符串
   * @param key 当前正在处理的公式标识符
   * @param formulas 公式映射表 - 包含需要替换的标识符与对应公式的键值对
   * @param columnar 初始列式字符串 - 需要执行替换操作的原始字符串
   * @returns 完成所有公式标识符替换后的最终字符串
   * 
   * 实现逻辑：
   * 通过正则表达式全局匹配，将初始字符串中所有出现的公式标识符（formulas对象的键）
   * 替换为对应的公式表达式（formulas对象的值），最终生成完整的列式计算公式字符串
   */
  let columnarFormulas = Object.keys(formulas).reduce((acc, key) => {
    return acc.replace(new RegExp(key, 'g'), formulas[key]);
  }, columnar);
  // console.log("columnarFormulas", columnarFormulas);
  // console.log("variables", variables);
  // 替换 π 为 math.pi
  columnarFormulas = columnarFormulas.replace(/π/gi, 'pi');
  // 替换 ^ 为幂运算符 pow
  // columnarFormulas = columnarFormulas.replace(/\^/g, '**');
  // console.log('columnarFormulas:', columnarFormulas, JSON.stringify(variables));

  try {
    return math.evaluate(columnarFormulas, variables);
  } catch (error: any) {
    return 0;
  }
}

export const getMathEvaluate = (formulas: any, variables: any) => {
  // console.log("variables", variables);
  // 替换 π 为 math.pi
  formulas = formulas.replace(/π/gi, 'pi');
  // 替换 ^ 为幂运算符 pow
  // formulas = formulas.replace(/\^/g, '**');
  // console.log('columnarFormulas:', formulas, JSON.stringify(variables));
  try {
    return math.evaluate(formulas, variables);
  } catch (error: any) {
    return 0;
  }
};

export const getVariables = (parameters: any, tolerance: any, queryForm: any) => {
  const myL = queryForm.diameterLength || 0;
  const variables = {} as any;
  let conditionL = 'A'
  variables['L'] = Number(queryForm.diameterLength || 0);
  variables['P'] = Number(queryForm.pitch || variables['P'] || 0);
  // 2. 替换占位符 {xxx} 为 值
  if (queryForm.mon && parameters[queryForm.mon]) {
    // 替换逻辑
    for (const [key, value] of Object.entries(parameters[queryForm.mon])) {
      if (typeof value === 'string' || typeof value === 'number') {
        if (key === 'L') {
          variables[key] = Number(myL);
        } else if (key === 'P') {
          variables[key] = Number(queryForm.pitch || value || 0);
        } else {
          variables[key] = Number.isNaN(value) ? Number(value || 0) : value;
        }
      } else if (typeof value === 'object' && value !== null) {
        // 复杂替换：对象类型
        if ('condition' in value) {
          // 根据条件选择 A 或 B
          const conditionValue = value as any;
          const conditionResult = evaluateConditionDefault(conditionValue.condition, parameters, queryForm);
          // 存在AB的情况
          if (conditionValue.hasOwnProperty('A') && conditionValue.hasOwnProperty('B')) {
            conditionL = conditionResult ? 'A' : 'B';
            variables[key] = Number(conditionResult ? (conditionValue.A ?? 0) : (conditionValue.B ?? 0));
          } else if (conditionResult) {
            // AB不存在的情况，判断值是否符合条件
            Object.keys(conditionValue).forEach((_key: string) => {
              const key2 = _key as string;
              if (evaluateConditionDefault(key2, parameters, queryForm)) {
                // variables[key] = conditionValue[key2];
                conditionL = key2;
              }
            });
          }
        } else {
          // 根据范围选择值
          let replacementValue = ''
          for (const [range, rangeValue] of Object.entries(value)) {
            if (evaluateConditionDefault(range, parameters, queryForm)) {
              replacementValue = rangeValue;
              if (!!rangeValue) break;
            }
          }
          variables[key] = Number.isNaN(replacementValue) ? Number(replacementValue) : replacementValue;
        }
      }
    }
  }
  function calculateExpression(expression: string) {
    try {
      // 使用 evaluate 方法计算表达式的值
      return math.evaluate(expression);
    } catch (error: any) {
      console.error(`计算过程中出现错误: ${error.message}`);
      return null;
    }
  }
  // 计算公差
  if (tolerance) {
    Object.keys(tolerance).map((item) => {
      const parsedCondition = evaluateConditionDefault(item, parameters, queryForm);
      if (parsedCondition) {
        // A\B\C
        if (tolerance[item][conditionL]) {
          const LMax = tolerance[item][conditionL]['max'] || '-0'
          const LMin = tolerance[item][conditionL]['min'] || '+0'
          variables['LMin'] = formatNumber(calculateExpression(`${myL}${LMin.startsWith('+') ? '' : '+'}${LMin}`));
          variables['LMax'] = formatNumber(calculateExpression(`${myL}${LMax.startsWith('+') ? '' : '+'}${LMax}`));
        } else if (Object.keys(tolerance[item]).length === 1 && ['A', 'B', 'C'].includes(Object.keys(tolerance[item])[0])) {
          const LMax = tolerance[item][Object.keys(tolerance[item])[0]]['max'] || '-0'
          const LMin = tolerance[item][Object.keys(tolerance[item])[0]]['min'] || '+0'
          variables['LMin'] = formatNumber(calculateExpression(`${myL}${LMin.startsWith('+') ? '' : '+'}${LMin}`));
          variables['LMax'] = formatNumber(calculateExpression(`${myL}${LMax.startsWith('+') ? '' : '+'}${LMax}`));
        } else {
          Object.keys(tolerance[item]).map((k) => {
            const kCondition = evaluateConditionDefault(k, parameters, queryForm);
            if (kCondition) {
              const LMax = tolerance[item][k]['max'] || '-0'
              const LMin = tolerance[item][k]['min'] || '+0'
              variables['LMin'] = formatNumber(calculateExpression(`${myL}${LMin.startsWith('+') ? '' : '+'}${LMin}`));
              variables['LMax'] = formatNumber(calculateExpression(`${myL}${LMax.startsWith('+') ? '' : '+'}${LMax}`));
            }
          });
        }
      }
    })
  }
  return variables;
}

export const formatNumber = (num: number | string, fixed: number = 3) => {
  return Number(Number(num || 0).toFixed(fixed || 3)).toString();
}