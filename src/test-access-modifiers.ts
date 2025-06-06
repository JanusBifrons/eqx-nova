// Test file to verify ESLint rule for explicit member accessibility
export class TestClass {
  private testProperty: string = 'test';

  // This should trigger ESLint error - missing access modifier
  testMethod(): void {
    console.log('test');
  }

  // This should be correct
  public anotherTestMethod(): void {
    console.log('another test');
  }
}
