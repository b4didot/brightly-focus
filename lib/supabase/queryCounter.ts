type QueryCounterOptions = {
  label: string
  threshold?: number
}

type QueryCounterState = {
  label: string
  threshold: number
  count: number
}

const DEFAULT_THRESHOLD = 3

function shouldLogQueries() {
  return process.env.NODE_ENV !== "production"
}

function isSqlRequest(url: string) {
  return url.includes("/rest/v1/")
}

function warnIfOverThreshold(state: QueryCounterState) {
  if (!shouldLogQueries()) {
    return
  }

  if (state.count > state.threshold) {
    console.warn(
      `[query-counter] ${state.label} executed ${state.count} SQL calls (threshold: ${state.threshold}).`
    )
  } else {
    console.info(
      `[query-counter] ${state.label} executed ${state.count} SQL calls (threshold: ${state.threshold}).`
    )
  }
}

export function createQueryCounter(options: QueryCounterOptions) {
  const state: QueryCounterState = {
    label: options.label,
    threshold: options.threshold ?? DEFAULT_THRESHOLD,
    count: 0,
  }

  return {
    onRequest(url: string) {
      if (isSqlRequest(url)) {
        state.count += 1
      }
    },
    getCount() {
      return state.count
    },
    finalize() {
      warnIfOverThreshold(state)
      return state.count
    },
  }
}

export async function withQueryCounter<T>(
  options: QueryCounterOptions,
  operation: (counter: ReturnType<typeof createQueryCounter>) => Promise<T>
) {
  const counter = createQueryCounter(options)
  try {
    return await operation(counter)
  } finally {
    counter.finalize()
  }
}
