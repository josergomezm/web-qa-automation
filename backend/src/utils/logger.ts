// Simple colored console logger for better readability

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Text colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m'
};

const getTimestamp = () => {
  return new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};

const formatMessage = (level: string, color: string, bgColor: string, message: string, ...args: any[]) => {
  const timestamp = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
  const levelTag = `${bgColor}${colors.white} ${level} ${colors.reset}`;
  const formattedMessage = `${color}${message}${colors.reset}`;
  
  console.log(`${timestamp} ${levelTag} ${formattedMessage}`, ...args);
};

export const logger = {
  info: (message: string, ...args: any[]) => {
    formatMessage('INFO', colors.blue, colors.bgBlue, message, ...args);
  },
  
  success: (message: string, ...args: any[]) => {
    formatMessage('SUCCESS', colors.green, colors.bgGreen, message, ...args);
  },
  
  warning: (message: string, ...args: any[]) => {
    formatMessage('WARN', colors.yellow, colors.bgYellow, message, ...args);
  },
  
  error: (message: string, ...args: any[]) => {
    formatMessage('ERROR', colors.red, colors.bgRed, message, ...args);
  },
  
  debug: (message: string, ...args: any[]) => {
    formatMessage('DEBUG', colors.magenta, colors.bgMagenta, message, ...args);
  },
  
  test: (message: string, ...args: any[]) => {
    formatMessage('TEST', colors.cyan, colors.bgCyan, message, ...args);
  },
  
  step: (stepNum: number, total: number, message: string, ...args: any[]) => {
    const stepInfo = `${colors.bright}${colors.cyan}[${stepNum}/${total}]${colors.reset}`;
    const timestamp = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
    console.log(`${timestamp} ${stepInfo} ${colors.cyan}${message}${colors.reset}`, ...args);
  },
  
  separator: (title?: string) => {
    const line = '═'.repeat(60);
    if (title) {
      const paddedTitle = ` ${title} `;
      const totalLength = 60;
      const sideLength = Math.floor((totalLength - paddedTitle.length) / 2);
      const leftSide = '═'.repeat(sideLength);
      const rightSide = '═'.repeat(totalLength - sideLength - paddedTitle.length);
      console.log(`${colors.bright}${colors.blue}${leftSide}${paddedTitle}${rightSide}${colors.reset}`);
    } else {
      console.log(`${colors.bright}${colors.blue}${line}${colors.reset}`);
    }
  },
  
  json: (label: string, obj: any) => {
    const timestamp = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
    const jsonTag = `${colors.bgMagenta}${colors.white} JSON ${colors.reset}`;
    console.log(`${timestamp} ${jsonTag} ${colors.magenta}${label}:${colors.reset}`);
    console.log(JSON.stringify(obj, null, 2));
  }
};