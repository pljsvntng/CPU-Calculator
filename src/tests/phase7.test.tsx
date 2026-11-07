import { beforeEach,afterEach,it,expect,vi } from 'vitest'
import { render,screen,fireEvent,waitFor,within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { readMissions } from '../utils/simulationStorage'
const click=(name:string)=>fireEvent.click(screen.getByRole('button',{name,exact:true}))
beforeEach(()=>{localStorage.clear();vi.stubGlobal('ResizeObserver',class{observe(){} unobserve(){} disconnect(){}})})
afterEach(()=>vi.unstubAllGlobals())
it('loads one shared lecture dataset, compares two real policies, and marks edits stale',async()=>{
  render(<MemoryRouter initialEntries={['/compare']}><App/></MemoryRouter>)
  click('Load Lecture Example');click('COMPARE ALGORITHMS')
  await waitFor(()=>expect(screen.getByRole('heading',{name:'SCHEDULING PERFORMANCE REPORT'})).toBeInTheDocument(),{timeout:10000})
  expect(screen.getByRole('table',{name:'Successful results from one shared dataset'})).toHaveTextContent('6.8000')
  expect(screen.getByRole('table',{name:'Successful results from one shared dataset'})).toHaveTextContent('5.2000')
  expect(screen.getAllByRole('region',{name:/ chart$/})).toHaveLength(6)
  fireEvent.change(screen.getByLabelText('P1 burst time'),{target:{value:'8'}})
  expect(screen.getByRole('button',{name:'Export comparison CSV'})).toBeDisabled()
},30000)
it('saves a real calculation, loads the archive, and renames and duplicates input-only missions',async()=>{
  render(<MemoryRouter initialEntries={['/calculator']}><App/></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('LOAD LECTURE EXAMPLE'),{target:{value:'6'}});click('LOAD & SIMULATE')
  await waitFor(()=>expect(screen.getByRole('status',{name:'Calculation status'})).toHaveTextContent('Calculation completed'),{timeout:10000})
  fireEvent.change(screen.getByLabelText('Mission name'),{target:{value:'Lecture study'}});click('SAVE MISSION')
  await waitFor(()=>expect(readMissions().missions).toHaveLength(1))
  fireEvent.click(within(screen.getByRole('navigation',{name:'Main navigation'})).getByRole('link',{name:'Saved Calculations'}))
  expect(screen.getByRole('heading',{name:'Lecture study'})).toBeInTheDocument();click('Rename')
  fireEvent.change(screen.getByLabelText('New mission name'),{target:{value:'Revised study'}});click('Save name');click('Duplicate')
  expect(readMissions().missions.map(m=>m.name)).toEqual(['Revised study','Revised study copy'])
  click('Clear all simulations');click('Cancel deletion');expect(readMissions().missions).toHaveLength(2)
},30000)
