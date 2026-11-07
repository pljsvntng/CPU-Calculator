import { useCallback, useEffect, useState } from 'react'
import type { SchedulingResult } from '../types/scheduling'
import { lastIndexAtOrBefore } from '../utils/ganttScale'

interface PlaybackState { result: SchedulingResult; outdated: boolean; time: number; eventIndex: number; playing: boolean; selectedProcessId: string | null }
const initialPlayback = (result: SchedulingResult, outdated: boolean): PlaybackState => ({ result, outdated, time: Number(result.metrics.observationStartTime), eventIndex: -1, playing: false, selectedProcessId: result.processes[0]?.id ?? null })
const eventProcess = (result: SchedulingResult, index: number) => result.events[index]?.processId ?? result.events[index]?.runningProcessId ?? null
export function useSimulationPlayback(result: SchedulingResult, outdated: boolean) {
  const [state, setState] = useState(() => initialPlayback(result, outdated))
  const [speed, setSpeed] = useState(1)
  // A new result is a new playback session. Adjust before committing children,
  // so neither a stale frame nor a resumable old timer reaches the screen.
  if (state.result !== result) setState(initialPlayback(result, outdated))
  else if (state.outdated !== outdated) setState({ ...state, outdated, playing: false })
  const end = result.metrics.observationEndTime
  const playing = state.playing && !outdated && state.time < end
  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now()
      const elapsed = (now - last) / 1000 * speed
      last = now
      setState(previous => {
        const time = Math.min(end, previous.time + elapsed)
        const eventIndex = lastIndexAtOrBefore(result.events, time, event => event.timestamp)
        return { ...previous, time, eventIndex, selectedProcessId: eventIndex === previous.eventIndex ? previous.selectedProcessId : eventProcess(result, eventIndex) }
      })
    }, 50)
    const pauseHidden = () => { if (document.hidden) setState(previous => ({ ...previous, playing: false })) }
    document.addEventListener('visibilitychange', pauseHidden)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', pauseHidden) }
  }, [playing, result, end, speed])
  const step = (direction: number) => setState(previous => {
    const eventIndex = Math.max(-1, Math.min(result.events.length - 1, previous.eventIndex + direction))
    return { ...previous, playing: false, time: result.events[eventIndex]?.timestamp ?? 0, eventIndex, selectedProcessId: eventProcess(result, eventIndex) }
  })
  const selectProcess = useCallback((id: string) => {
    if (result.processes.some(process => process.id === id)) setState(previous => ({ ...previous, selectedProcessId: id, playing: false }))
  }, [result])
  return { time: state.time, eventIndex: state.eventIndex, speed, setSpeed, playing, selectedProcessId: state.selectedProcessId,
    selectProcess,
    goToEvent: (index: number) => {
      const eventIndex = Math.max(-1, Math.min(result.events.length - 1, index))
      setState(previous => ({ ...previous, playing: false, time: result.events[eventIndex]?.timestamp ?? 0, eventIndex, selectedProcessId: eventProcess(result, eventIndex) }))
    },
    play: () => {
      if (!outdated) setState(previous => ({ ...previous, ...(previous.time >= end ? { time: 0, eventIndex: -1, selectedProcessId: result.processes[0]?.id ?? null } : {}), playing: true }))
    },
    pause: () => setState(previous => ({ ...previous, playing: false })),
    previous: () => step(-1), next: () => step(1),
    restart: () => setState(initialPlayback(result, outdated)),
    seek: (time: number) => {
      const bounded = Math.max(0, Math.min(end, time))
      const eventIndex = lastIndexAtOrBefore(result.events, bounded, event => event.timestamp)
      setState(previous => ({ ...previous, playing: false, time: bounded, eventIndex, selectedProcessId: eventProcess(result, eventIndex) }))
    },
  }
}
export type SimulationPlayback = ReturnType<typeof useSimulationPlayback>
