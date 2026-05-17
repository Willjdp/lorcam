import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Atrapa el foco dentro de un contenedor mientras `active` sea true.
 * Al activarse, mueve el foco al primer elemento focusable.
 * Al desactivarse, devuelve el foco al elemento que lo tenía antes.
 */
export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const savedFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    savedFocus.current = document.activeElement as HTMLElement
    const container = containerRef.current
    if (!container) return

    const focusable = () => [...container.querySelectorAll<HTMLElement>(FOCUSABLE)]

    // Mueve el foco al primer elemento interactivo del contenedor
    focusable()[0]?.focus()

    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    container.addEventListener('keydown', trap)
    return () => {
      container.removeEventListener('keydown', trap)
      savedFocus.current?.focus()
    }
  }, [active])

  return containerRef
}
