import { Cpu, ArrowRight } from 'lucide-react'
import { CrewAvatar } from './CrewAvatar'

export function SpaceshipScene() {
  return <div className="ship-illustration" role="img" aria-label="Spaceship observation deck: colorful process crewmates wait for the CPU. Conceptual illustration, not a calculated schedule.">
    <div className="viewport-label"><span className="port-indicator" /> OBSERVATION DECK <span className="mono">CPU–01</span></div>
    <div className="observation-window">
      <svg className="space-scenery" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="#D7E6F7"><circle cx="28" cy="42" r="1.7" /><circle cx="102" cy="22" r="1" /><circle cx="178" cy="68" r="1.6" /><circle cx="302" cy="25" r="1.5" /><circle cx="367" cy="90" r="1" /><circle cx="250" cy="114" r="1" /><circle cx="70" cy="131" r="1" /><path d="m326 63 2-5 2 5 5 2-5 2-2 5-2-5-5-2Z" /></g><circle cx="83" cy="67" r="27" fill="#334967" /><path d="M55 67c-17 12-12 17 18 13 28-4 47-13 42-17" stroke="#778CA8" strokeWidth="5" fill="none" /><path d="M0 232c93-44 263-50 400-3v21H0Z" fill="#344258" /><path d="M0 243c114-33 271-32 400 0" stroke="#536277" strokeWidth="2" /></svg>
      <div className="deck-crew crew-left"><CrewAvatar processId={1} size={89} /><span className="mono">P1</span></div>
      <div className="deck-console"><div className="console-screen"><Cpu size={35} strokeWidth={1.7} /><span>CPU</span><div className="console-readouts"><i /><i /><i /></div></div><div className="console-stand" /></div>
      <div className="deck-crew crew-right"><CrewAvatar processId={6} size={78} /><span className="mono">P6</span></div>
      <span className="window-bolt bolt-top-left" /><span className="window-bolt bolt-top-right" /><span className="window-bolt bolt-bottom-left" /><span className="window-bolt bolt-bottom-right" />
    </div>
    <div className="deck-caption"><span>READY QUEUE</span><ArrowRight size={16} /><span>CPU DISPATCH</span></div>
    <p>Conceptual crew illustration · no computed values</p>
  </div>
}
