interface LogLevel {
  INFO: 'info'
  WARN: 'warn'
  ERROR: 'error'
  DEBUG: 'debug'
  AUDIT: 'audit'
}

interface LogEntry {
  level: keyof LogLevel
  message: string
  timestamp: string
  context?: Record<string, any>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export class Logger {
  private static isDevelopment = typeof process !== 'undefined' && process.env.NODE_ENV === 'development'
  private static isProduction = typeof process !== 'undefined' && process.env.NODE_ENV === 'production'

  /**
   * 信息日志
   */
  static info(message: string, context?: Record<string, any>): void {
    this.log('INFO', message, context)
  }

  /**
   * 警告日志
   */
  static warn(message: string, context?: Record<string, any>): void {
    this.log('WARN', message, context)
  }

  /**
   * 错误日志
   */
  static error(message: string, error?: Error, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      level: 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      context,
    }

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      }
    }

    this.output(logEntry)
  }

  /**
   * 调试日志 (仅开发环境)
   */
  static debug(message: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.log('DEBUG', message, context)
    }
  }

  /**
   * 审计日志 - 用于安全相关操作
   */
  static audit(action: string, adminId: string, context?: Record<string, any>): void {
    const auditEntry: LogEntry = {
      level: 'AUDIT',
      message: `Admin action: ${action}`,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        adminId,
        action,
      },
    }

    this.output(auditEntry)
  }

  /**
   * API 请求日志
   */
  static apiRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: Record<string, any>
  ): void {
    const level = statusCode >= 400 ? 'WARN' : 'INFO'
    
    this.log(level, `${method} ${path} - ${statusCode} (${duration}ms)`, {
      method,
      path,
      statusCode,
      duration,
      ...context,
    })
  }

  /**
   * 数据库操作日志
   */
  static database(operation: string, table: string, duration?: number, context?: Record<string, any>): void {
    this.log('DEBUG', `DB ${operation}: ${table}`, {
      operation,
      table,
      duration,
      ...context,
    })
  }

  /**
   * 性能监控日志
   */
  static performance(metric: string, value: number, unit: string = 'ms', context?: Record<string, any>): void {
    this.log('INFO', `Performance: ${metric} = ${value}${unit}`, {
      metric,
      value,
      unit,
      ...context,
    })
  }

  /**
   * 安全事件日志
   */
  static security(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: Record<string, any>): void {
    const level = severity === 'critical' || severity === 'high' ? 'ERROR' : 'WARN'
    
    this.log(level, `Security event: ${event}`, {
      event,
      severity,
      ...context,
    })
  }

  /**
   * 通用日志方法
   */
  private static log(level: keyof LogLevel, message: string, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    }

    this.output(logEntry)
  }

  /**
   * 输出日志
   */
  private static output(entry: LogEntry): void {
    if (this.isDevelopment) {
      // 开发环境：格式化输出到控制台
      this.outputToConsole(entry)
    } else {
      // 生产环境：结构化 JSON 输出
      this.outputAsJSON(entry)
    }
  }

  /**
   * 控制台输出 (开发环境)
   */
  private static outputToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString()
    const level = entry.level.padEnd(5)
    const message = entry.message
    
    let output = `[${timestamp}] ${level} ${message}`
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`
    }
    
    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`
      if (entry.error.stack) {
        output += `\n  Stack: ${entry.error.stack}`
      }
    }
    
    switch (entry.level) {
      case 'ERROR':
        console.error(output)
        break
      case 'WARN':
        console.warn(output)
        break
      case 'DEBUG':
        console.debug(output)
        break
      default:
        console.log(output)
    }
  }

  /**
   * JSON 输出 (生产环境)
   */
  private static outputAsJSON(entry: LogEntry): void {
    const jsonEntry = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      ...entry.context,
      ...(entry.error && { error: entry.error }),
    }
    
    console.log(JSON.stringify(jsonEntry))
  }

  /**
   * 创建计时器 - 用于性能监控
   */
  static timer(label: string): () => void {
    const start = Date.now()
    
    return () => {
      const duration = Date.now() - start
      this.performance(label, duration)
    }
  }

  /**
   * 异步操作包装器 - 自动记录性能和错误
   */
  static async withLogging<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const timer = this.timer(operation)
    
    try {
      this.debug(`Starting: ${operation}`, context)
      const result = await fn()
      timer()
      this.debug(`Completed: ${operation}`, context)
      return result
    } catch (error) {
      timer()
      this.error(`Failed: ${operation}`, error as Error, context)
      throw error
    }
  }
}