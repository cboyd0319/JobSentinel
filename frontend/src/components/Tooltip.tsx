import { useState, useRef, useEffect, type ReactNode } from 'react'

interface TooltipProps {
  content: string | ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactNode
  delay?: number
}

export function Tooltip({ content, position = 'top', children, delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number>()

  const handleMouseEnter = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true)
      updatePosition()
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const updatePosition = () => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    let x = 0
    let y = 0

    switch (position) {
      case 'top':
        x = rect.left + rect.width / 2
        y = rect.top - 8
        break
      case 'bottom':
        x = rect.left + rect.width / 2
        y = rect.bottom + 8
        break
      case 'left':
        x = rect.left - 8
        y = rect.top + rect.height / 2
        break
      case 'right':
        x = rect.right + 8
        y = rect.top + rect.height / 2
        break
    }

    setCoords({ x, y })
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getTooltipStyle = () => {
    const baseStyle = 'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg max-w-xs'
    const positionStyle = {
      top: '-translate-x-1/2 -translate-y-full',
      bottom: '-translate-x-1/2',
      left: '-translate-y-1/2 -translate-x-full',
      right: '-translate-y-1/2',
    }

    return `${baseStyle} ${positionStyle[position]}`
  }

  const getArrowStyle = () => {
    const baseStyle = 'absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45'
    const positionStyle = {
      top: 'bottom-[-4px] left-1/2 -translate-x-1/2',
      bottom: 'top-[-4px] left-1/2 -translate-x-1/2',
      left: 'right-[-4px] top-1/2 -translate-y-1/2',
      right: 'left-[-4px] top-1/2 -translate-y-1/2',
    }

    return `${baseStyle} ${positionStyle[position]}`
  }

  return (
    <div
      ref={triggerRef}
      className="inline-block relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={getTooltipStyle()}
          style={{
            left: `${coords.x}px`,
            top: `${coords.y}px`,
          }}
          role="tooltip"
        >
          {content}
          <div className={getArrowStyle()} aria-hidden="true" />
        </div>
      )}
    </div>
  )
}

interface HelpIconProps {
  content: string | ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function HelpIcon({ content, position = 'top' }: HelpIconProps) {
  return (
    <Tooltip content={content} position={position}>
      <button
        type="button"
        className="inline-flex items-center justify-center w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        aria-label="Help information"
      >
        <span className="text-xs font-bold">?</span>
      </button>
    </Tooltip>
  )
}
