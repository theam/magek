import * as os from 'os'

export interface OsInfoCpuResult {
  cpu: os.CpuInfo
  timesPercentages: Array<number>
}

export interface OsInfoMemoryResult {
  totalBytes: number
  freeBytes: number
}

export interface OsInfoResult {
  cpus: Array<OsInfoCpuResult>
  memory: OsInfoMemoryResult
}

export async function osInfo(): Promise<OsInfoResult> {
  const rawCpus = os.cpus()
  const cpus = rawCpus.length > 0 ? rawCpus : [fallbackCpuInfo()]
  const cpuResult = cpus.map((cpu: os.CpuInfo) => {
    // times is an object containing the number of CPU ticks spent in: user, nice, sys, idle, and irq
    const totalTimes = Object.values(cpu.times).reduce((accumulator, value) => accumulator + value, 0)
    const safeTotalTimes = totalTimes === 0 ? 1 : totalTimes
    const timesPercentages = Object.values(cpu.times).map((time) =>
      Math.round((100 * time) / safeTotalTimes)
    )
    return {
      cpu,
      timesPercentages,
    }
  })

  return {
    cpus: cpuResult,
    memory: {
      totalBytes: os.totalmem(),
      freeBytes: os.freemem(),
    },
  }
}

function fallbackCpuInfo(): os.CpuInfo {
  return {
    model: 'unknown',
    speed: 0,
    times: {
      user: 0,
      nice: 0,
      sys: 0,
      idle: 0,
      irq: 0,
    },
  }
}
