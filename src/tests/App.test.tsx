import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { algorithms } from '../data/algorithms'
import { THEME_KEY } from '../utils/theme'

function renderApp(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
}

beforeEach(() => {
  localStorage.clear()
  // Existing theme-toggle checks begin from an explicit saved light preference.
  localStorage.setItem(THEME_KEY, 'light')
  document.documentElement.removeAttribute('data-theme')
})

describe('workspace navigation', () => {
  it.each([
    ['Dashboard', 'CPU SCHEDULING LAB'],
    ['Calculator', 'CPU SCHEDULING SIMULATOR'],
    ['Compare Algorithms', 'MISSION PERFORMANCE COMPARISON'],
    ['Learning Center', 'CREWMATE ACADEMY'],
    ['Practice Mode', 'TRAINING MISSIONS'],
    ['Saved Calculations', 'MISSION ARCHIVE'],
    ['About', 'About CPU Scheduling Lab'],
  ])('opens %s using the sidebar', async (link, heading) => {
    const user = userEvent.setup()
    renderApp()
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' })
    await user.click(within(navigation).getByRole('link', { name: link }))
    expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeInTheDocument()
    expect(within(navigation).getByRole('link', { name: link })).toHaveAttribute('aria-current', 'page')
  })

  it('offers recovery for an unknown route', () => {
    renderApp('/missing-page')
    expect(screen.getByRole('heading', { name: 'Page not found', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Dashboard' })).toHaveAttribute('href', '/')
  })

  it('closes the mobile drawer when its home brand is selected', async () => {
    const user = userEvent.setup()
    renderApp('/calculator')
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const drawer = screen.getByRole('dialog', { name: 'Mobile navigation' })
    await user.click(within(drawer).getByRole('link', { name: 'CPU Scheduling Lab home' }))
    expect(drawer).not.toHaveAttribute('open')
    expect(screen.getByRole('heading', { name: 'CPU SCHEDULING LAB', level: 1 })).toBeInTheDocument()
  })

  it('opens help and follows its learning link', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Open help' }))
    const help = screen.getByRole('dialog', { name: 'Your scheduling workspace' })
    expect(help).toBeVisible()
    await user.click(within(help).getByRole('link', { name: 'Open Learning Center' }))
    expect(screen.getByRole('heading', { name: 'CREWMATE ACADEMY', level: 1 })).toBeInTheDocument()
    expect(help).not.toHaveAttribute('open')
  })
})

describe('theme preference', () => {
  it('starts in spaceship dark mode when no preference has been saved', () => {
    localStorage.clear()
    renderApp()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
  })
  it('toggles and persists the chosen theme across remounts', async () => {
    const user = userEvent.setup()
    const app = renderApp()
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    app.unmount()
    renderApp('/learn')
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
})

describe('lecture algorithm library', { timeout: 15_000 }, () => {
  it('selects each of the eight algorithms and links to its input configuration', async () => {
    const user = userEvent.setup()
    renderApp('/learn')
    for (const algorithm of algorithms) {
      const option = screen.getByRole('button', { name: `${algorithm.id} ${algorithm.name}` })
      await user.click(option)
      expect(option).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('region', { name: 'Lesson and quiz workspace' })).toHaveFocus()
      expect(screen.getByRole('heading', { name: algorithm.name, level: 2 })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: `Configure ${algorithm.id} inputs` })).toHaveAttribute('href', `/calculator?algorithm=${algorithm.id}`)
    }
  })

  it('supports direct algorithm links and browser-style query navigation', () => {
    renderApp('/learn?algorithm=MLFQ')
    expect(screen.getByRole('heading', { name: 'Multilevel Feedback Queue', level: 2 })).toBeInTheDocument()
  })
})

describe('calculator input foundation', { timeout: 15_000 }, () => {
  it('loads only example inputs and resets the process crew to a blank draft', async () => {
    const user = userEvent.setup()
    renderApp('/calculator')
    await user.click(screen.getByRole('button', { name: 'LOAD MISSION' }))
    expect(screen.getAllByRole('button', { name: /Remove process P/ })).toHaveLength(5)
    expect(screen.getByRole('spinbutton', { name: 'P1 burst time' })).toHaveValue(5)
    expect(screen.getByRole('status', { name: 'Input source' })).toHaveTextContent('Sample mission inputs loaded')
    expect(screen.getByText('No calculated results')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Simulation (Calculate CPU Schedule)' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'RESET CREW' }))
    expect(screen.getAllByRole('button', { name: /Remove process P/ })).toHaveLength(1)
    expect(screen.getByRole('spinbutton', { name: 'P1 arrival time' })).toHaveValue(null)
    expect(screen.getByRole('spinbutton', { name: 'P1 burst time' })).toHaveValue(null)
    expect(screen.getByRole('spinbutton', { name: 'P1 burst time' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('status', { name: 'Input source' })).toHaveTextContent('Fresh process draft')
  })

  it('keeps remaining crewmate colors tied to their IDs after removing a process', async () => {
    const user = userEvent.setup()
    renderApp('/calculator')
    await user.click(screen.getByRole('button', { name: 'LOAD MISSION' }))
    await user.click(screen.getByRole('button', { name: 'Remove process P1' }))
    expect(screen.getByText('Blue').closest('[data-process-id]')).toHaveAttribute('data-process-id', '2')
    expect(screen.getByText('Green').closest('[data-process-id]')).toHaveAttribute('data-process-id', '3')
  })

  it('enables queue assignments while leaving future visualizations explicitly upcoming', () => {
    renderApp('/calculator?algorithm=MLQ')
    expect(screen.getByRole('combobox', { name: 'P1 queue assignment' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Start Simulation (Calculate CPU Schedule)' })).toBeDisabled()
    expect(screen.getByText('No calculated timeline')).toBeInTheDocument()
    expect(screen.getByText('No calculation details yet')).toBeInTheDocument()
    expect(screen.getByText('No calculated results')).toBeInTheDocument()
  })
  it('adds and removes rows and retains the draft during page navigation', async () => {
    const user = userEvent.setup()
    renderApp('/calculator')
    expect(screen.getByRole('button', { name: 'Remove process P1' })).toBeEnabled()
    await user.type(screen.getByRole('spinbutton', { name: 'P1 arrival time' }), '0')
    await user.type(screen.getByRole('spinbutton', { name: 'P1 burst time' }), '7')
    await user.click(screen.getByRole('button', { name: 'Add Crewmate (Add Process)' }))
    expect(screen.getByRole('spinbutton', { name: 'P2 arrival time' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove process P2' }))
    expect(screen.queryByRole('spinbutton', { name: 'P2 arrival time' })).not.toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    await user.click(within(nav).getByRole('link', { name: 'Dashboard' }))
    await user.click(within(nav).getByRole('link', { name: 'Calculator' }))
    expect(screen.getByRole('spinbutton', { name: 'P1 burst time' })).toHaveValue(7)
    expect(screen.getByRole('spinbutton', { name: 'P1 arrival time' })).toHaveValue(0)
  })

  it('shows conditional policy fields and validates invalid input', async () => {
    const user = userEvent.setup()
    renderApp('/calculator')
    await user.selectOptions(screen.getByLabelText('Scheduling algorithm'), 'NPP')
    expect(screen.getByRole('spinbutton', { name: 'P1 priority' })).toBeInTheDocument()
    await user.type(screen.getByRole('spinbutton', { name: 'P1 burst time' }), '0')
    expect(screen.getByRole('spinbutton', { name: 'P1 burst time' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Burst time must be a positive safe integer.')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Scheduling algorithm'), 'RR')
    expect(screen.queryByRole('spinbutton', { name: 'P1 priority' })).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Time quantum/)).toBeInTheDocument()
    await user.clear(screen.getByLabelText(/Time quantum/))
    await user.type(screen.getByLabelText(/Time quantum/), '3')
    expect(screen.getByLabelText(/Time quantum/)).toHaveValue(3)
  })

  it('does not expose results or an enabled calculate action for an incomplete draft', () => {
    renderApp('/calculator?algorithm=RR')
    expect(screen.getByLabelText('Scheduling algorithm')).toHaveValue('RR')
    expect(screen.getByRole('button', { name: 'Start Simulation (Calculate CPU Schedule)' })).toBeDisabled()
    expect(screen.getByText('No calculated timeline')).toBeInTheDocument()
    expect(screen.getByText('No calculated results')).toBeInTheDocument()
    expect(screen.getByText('No calculation details yet')).toBeInTheDocument()
  })

  it('retains an algorithm opened through a deep link when navigating away and back', async () => {
    const user = userEvent.setup()
    renderApp('/calculator?algorithm=RR')
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    await user.click(within(nav).getByRole('link', { name: 'Dashboard' }))
    await user.click(within(nav).getByRole('link', { name: 'Calculator' }))
    expect(screen.getByLabelText('Scheduling algorithm')).toHaveValue('RR')
    expect(screen.getByLabelText(/Time quantum/)).toBeInTheDocument()
  })
})




