import { Link } from 'react-router-dom'
import { Bookmark, GraduationCap, GitCompareArrows, ArrowRight, BookOpen, Cpu, TriangleAlert, Check } from 'lucide-react'
import { EmptyState, PageIntro, Panel, UpcomingBadge } from '../components/ui'
import { CrewAvatar } from '../components/CrewAvatar'

export function ComparePage() {
  return <>
    <PageIntro eyebrow="STRATEGY DECK / COMPARE ALGORITHMS" title="Algorithm Comparison" description="One process crew. Different mission policies. A future workspace for comparing real scheduling results."><UpcomingBadge /></PageIntro>
    <Panel title="Algorithm comparison" caption="Same inputs. Different scheduling decisions." action={<UpcomingBadge />}><EmptyState icon={GitCompareArrows} title="Side-by-side comparison is upcoming" description="A later phase will compare execution timelines and calculated metrics for a shared set of inputs. Individual calculations are available now in the simulator."><Link className="button secondary" to="/learn">Explore the policies <ArrowRight size={16} aria-hidden="true" /></Link></EmptyState></Panel>
    <div className="feature-outline"><h2>What this workspace will help you examine</h2><div className="three-columns"><div><span className="mono">01</span><h3>Execution order</h3><p>See how each policy chooses the next ready process.</p></div><div><span className="mono">02</span><h3>Waiting and turnaround</h3><p>Compare computed timings from the same workload.</p></div><div><span className="mono">03</span><h3>Policy trade-offs</h3><p>Reason about fairness, responsiveness, and workload fit.</p></div></div></div>
  </>
}

export function PracticePage() {
  return <>
    <PageIntro eyebrow="PRACTICE MODE / APPLY YOUR KNOWLEDGE" title="TRAINING MISSIONS" description="Prepare for launch. Build your scheduling knowledge from first principles to advanced mission policies."><UpcomingBadge /></PageIntro>
    <div className="training-ranks">{[
      { name: 'Cadet', level: 'Beginner', crew: 3, description: 'Identify policies, process inputs, and execution order.' },
      { name: 'Engineer', level: 'Intermediate', crew: 6, description: 'Reason about arrivals, priorities, and time quanta.' },
      { name: 'Commander', level: 'Advanced', crew: 8, description: 'Evaluate policy trade-offs and multilevel queues.' },
    ].map(rank => <section className="panel training-rank" key={rank.name}><div><CrewAvatar processId={rank.crew} size={48} /><UpcomingBadge /></div><p className="eyebrow">{rank.level}</p><h2>{rank.name}</h2><p>{rank.description}</p><span className="rank-status mono">EXERCISES UPCOMING</span></section>)}</div>
    <Panel title="Scheduling exercises" action={<UpcomingBadge />}><EmptyState icon={GraduationCap} title="Guided practice is upcoming" description="Future exercises will let you solve scheduling scenarios and check your work against verified calculations. Exercises and scores will arrive in a later phase."><Link className="button secondary" to="/learn"><BookOpen size={16} aria-hidden="true" /> Review the algorithms</Link></EmptyState></Panel>
    <div className="reading-note"><h2>Prepare for your first exercise</h2><p>Start by identifying the selection rule, whether the running process can be interrupted, and which inputs the policy needs. For Round Robin, pay particular attention to the time quantum.</p></div>
  </>
}

export function SavedPage() {
  return <>
    <PageIntro eyebrow="SAVED CALCULATIONS / COLLECTION" title="MISSION ARCHIVE" description="A future home for your saved process crews, scheduling scenarios, and calculated mission reports."><UpcomingBadge /></PageIntro>
    <Panel title="Your calculations" action={<UpcomingBadge />}><EmptyState icon={Bookmark} title="Saving calculations is upcoming" description="No calculations have been saved. Persistent calculation storage and result history will be introduced in a later phase."><Link className="button secondary" to="/calculator">Open input workspace <ArrowRight size={16} aria-hidden="true" /></Link></EmptyState></Panel>
    <p className="support-note">Calculator input drafts remain available during navigation in the current tab. Reloading the page resets the draft.</p>
  </>
}

export function AboutPage() {
  return <>
    <PageIntro eyebrow="THE PROJECT / OUR PURPOSE" title="About CPU Scheduling Lab" description="An educational workspace for understanding how operating systems allocate CPU time." />
    <div className="about-grid"><Panel title="Built around the fundamentals"><div className="prose"><Cpu size={30} className="text-blue" aria-hidden="true" /><p>CPU Scheduling Lab brings the eight scheduling algorithms from Lecture 5 into a consistent learning workspace. The goal is to connect each policy with its behavior, inputs, and verified calculated results.</p><p>The course material covers FCFS, SJF, NPP, SRTF, PP, RR, MLQ, and MLFQ. Its learning outcomes are to identify scheduling algorithms and compute which algorithm is most efficient for a given scenario.</p><div className="source-box"><BookOpen size={19} aria-hidden="true" /><div><strong>Source material</strong><p>Lecture-5.pdf · Operating System<br />Jake R. Ersando · College of Engineering and Information Technology</p></div></div><p className="source-note">Descriptions are paraphrased for the interface. Clarifying notes distinguish the FCFS convoy effect from starvation and explain that multilevel queue behavior depends on the chosen queue policies.</p></div></Panel>
      <Panel title="Phase 6 · Crewmate Academy" caption="Current implementation status"><div className="phase-status"><h3>Available now</h3><ul><li><Check size={16} /> Responsive workspace and navigation</li><li><Check size={16} /> Light and dark themes</li><li><Check size={16} /> Eight-algorithm learning library</li><li><Check size={16} /> Eight verified scheduling engines</li><li><Check size={16} /> Editable crew, queue settings, and lecture examples</li><li><Check size={16} /> Real calculation reports and metrics</li><li><Check size={16} /> Interactive timeline, playback, and exports</li><li><Check size={16} /> Exact formulas and a synchronized execution walkthrough</li><li><Check size={16} /> Detailed lessons, quizzes and verified practice scoring</li><li><Check size={16} /> Local learning progress and optional achievements</li></ul><h3>Upcoming features</h3><p>Comparisons and saved results. Lessons, quizzes and guided practice are available now.</p><Link className="text-link" to="/learn">Open the Learning Center <ArrowRight size={15} aria-hidden="true" /></Link></div></Panel></div>
  </>
}

export function NotFoundPage() {
  return <><PageIntro eyebrow="WORKSPACE / 404" title="Page not found" description="This address does not match a page in CPU Scheduling Lab." /><Panel title="Find your way back"><EmptyState icon={TriangleAlert} title="Let’s return to the workspace" description="Explore the algorithms or prepare a new process input draft from the dashboard."><Link className="button primary" to="/">Back to Dashboard <ArrowRight size={16} aria-hidden="true" /></Link></EmptyState></Panel></>
}

