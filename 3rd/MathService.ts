class MathService {
  calculateString(expression: string): number {
    try {
      // biome-ignore lint/security/noGlobalEval: <explanation>
      return eval(expression);
    } catch (error) {
      console.error("Error evaluating expression:", error);
      throw new Error("Invalid expression");
    }
  }
}

export default MathService;
