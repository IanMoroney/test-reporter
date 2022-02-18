import {ParseOptions, TestParser} from '../../test-parser'
import {
  TestCaseError,
  TestCaseResult,
  TestExecutionResult,
  TestGroupResult,
  TestRunResult,
  TestSuiteResult
} from '../../test-results'
import {getExceptionSource} from '../../utils/node-utils'
import {getBasePath, normalizeFilePath} from '../../utils/path-utils'
import {MochawesomeJson, MochawesomeJsonTest, MochawesomeJsonResults, MochawesomeJsonSuites} from './mochawesome-json-types'

export class MochawesomeJsonParser implements TestParser {
  assumedWorkDir: string | undefined

  constructor(readonly options: ParseOptions) {}

  async parse(path: string, content: string): Promise<TestRunResult> {
    const mochawesome = this.getMochawesomeJson(path, content)
    const result = this.getTestRunResult(path, mochawesome)
    result.sort(true)
    return Promise.resolve(result)
  }

  private getMochawesomeJson(path: string, content: string): MochawesomeJson {
    try {
      return JSON.parse(content)
    } catch (e) {
      throw new Error(`Invalid JSON at ${path}\n\n${e}`)
    }
  }

  private getTestRunResult(resultsPath: string, mochawesome: MochawesomeJson): TestRunResult {
    const suitesMap: {[path: string]: TestSuiteResult} = {}

    const getSuite = (test: MochawesomeJsonResults): TestSuiteResult => {
      const path = this.getRelativePath(test.file)
      return suitesMap[path] ?? (suitesMap[path] = new TestSuiteResult(path, []))
    }

    for (const test of mochawesome.passes) {
      const suite = getSuite(test)
      this.processTest(suite, test, 'success')
    }

    for (const test of mochawesome.failures) {
      const suite = getSuite(test)
      this.processTest(suite, test, 'failed')
    }

    for (const test of mochawesome.pending) {
      const suite = getSuite(test)
      this.processTest(suite, test, 'skipped')
    }

    const suites = Object.values(suitesMap)
    return new TestRunResult(resultsPath, suites, mochawesome.stats.duration)
  }

  private processTest(suite: TestSuiteResult, test: MochawesomeJsonTest, result: TestExecutionResult): void {
    const groupName =
      test.fullTitle !== test.title
        ? test.fullTitle.substr(0, test.fullTitle.length - test.title.length).trimEnd()
        : null

    let group = suite.groups.find(grp => grp.name === groupName)
    if (group === undefined) {
      group = new TestGroupResult(groupName, [])
      suite.groups.push(group)
    }

    const error = this.getTestCaseError(test)
    const testCase = new TestCaseResult(test.title, result, test.duration ?? 0, error)
    group.tests.push(testCase)
  }

  private getTestCaseError(test: MochawesomeJsonTest): TestCaseError | undefined {
    const details = test.err.estack
    const message = test.err.message
    if (details === undefined) {
      return undefined
    }

    let path
    let line

    const src = getExceptionSource(details, this.options.trackedFiles, file => this.getRelativePath(file))
    if (src) {
      path = src.path
      line = src.line
    }

    return {
      path,
      line,
      message,
      details
    }
  }

  private getRelativePath(path: string): string {
    path = normalizeFilePath(path)
    const workDir = this.getWorkDir(path)
    if (workDir !== undefined && path.startsWith(workDir)) {
      path = path.substr(workDir.length)
    }
    return path
  }

  private getWorkDir(path: string): string | undefined {
    return (
      this.options.workDir ??
      this.assumedWorkDir ??
      (this.assumedWorkDir = getBasePath(path, this.options.trackedFiles))
    )
  }
}
