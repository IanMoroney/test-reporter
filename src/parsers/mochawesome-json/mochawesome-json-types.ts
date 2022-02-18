export interface MochawesomeJson {
  stats: MochawesomeJsonStats
  passes: MochawesomeJsonTest[]
  pending: MochawesomeJsonTest[]
  failures: MochawesomeJsonTest[]
}

export interface MochawesomeJsonStats {
  duration: number
}

export interface MochawesomeJsonResults {
  title: string
  file: string
  duration?: number
  suites: MochawesomeJsonSuites
}

export interface MochawesomeJsonSuites {
  title: string
  duration?: number
  tests: MochawesomeJsonTest
}

export interface MochawesomeJsonTest {
  title: string
  fullTitle: string
  duration?: number
  code: string
  state: string
  file: MochawesomeJsonResults["file"]
  err: MochawesomeJsonTestError
  suites: MochawesomeJsonResults["suites"]
}

export interface MochawesomeJsonTestError {
  estack?: string
  message?: string
}
