import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Layers3, ListOrdered, Lightbulb, Check, ChevronRight, Rocket } from 'lucide-react'
import { algorithms, learningObjectives } from '../data/algorithms'
import { AlgorithmCard } from '../components/AlgorithmCard'
import { SpaceshipScene } from '../components/SpaceshipScene'

export function DashboardPage() {
  return <>
    <div className="dashboard-intro"><p className="eyebrow"><span className="eyebrow-line" /> COMMAND DECK / MISSION CONTROL</p><span className="lecture-tag"><BookOpen size={14} aria-hidden="true" /> OPERATING SYSTEMS · LECTURE 05</span></div>
    <section className="dashboard-hero" aria-labelledby="dashboard-title">
      <div className="hero-copy"><span className="mission-eyebrow mono"><Rocket size={14} aria-hidden="true" /> WELCOME ABOARD, SCHEDULER</span><h1 id="dashboard-title">CPU SCHEDULING <span className="title-accent">LAB</span></h1>
        <p className="hero-subtitle">Manage Your Processes. Complete Your CPU Mission.</p>
        <p className="hero-description">Every crewmate has a task. Every process needs CPU time. Take the controls, explore eight scheduling policies, and learn how your operating system decides who goes next.</p>
        <div className="hero-actions"><Link to="/calculator" className="button primary" title="Open the scheduling calculator">START SCHEDULING <ArrowRight size={17} aria-hidden="true" /></Link><Link to="/learn" className="button secondary"><BookOpen size={17} aria-hidden="true" /> EXPLORE ALGORITHMS</Link></div>
        <p className="hero-footnote"><span className="status-dot" /> Eight policies connected · Configure, simulate, and review your crew</p>
      </div>
      <SpaceshipScene />
    </section>
    <div className="overview-strip" aria-label="Course overview">
      <div><span className="mono overview-number">08</span><span>Mission modules</span></div>
      <div><span className="mono overview-number">03</span><span>Non-preemptive missions</span></div>
      <div><span className="mono overview-number">05</span><span>Preemptive / queue-based missions</span></div>
      <Link to="/learn">ACCESS TRAINING ACADEMY <ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
    <div className="dashboard-body">
      <section aria-labelledby="algorithm-heading">
        <div className="section-heading"><div><p className="eyebrow">SELECT YOUR MISSION</p><h2 id="algorithm-heading">Scheduling mission modules</h2></div><Link className="text-link" to="/learn">View all <ArrowRight size={15} aria-hidden="true" /></Link></div>
        <div className="algorithm-groups">
          <section className="panel algorithm-group" aria-labelledby="non-preemptive-title">
            <div className="group-heading"><span className="group-icon"><ListOrdered size={19} aria-hidden="true" /></span><div><h3 id="non-preemptive-title">Non-Preemptive Missions</h3><p>One crewmate completes its CPU burst.</p></div><span className="group-count mono">03</span></div>
            {algorithms.filter(a => a.group === 'non-preemptive').map(a => <AlgorithmCard key={a.id} algorithm={a} />)}
          </section>
          <section className="panel algorithm-group" aria-labelledby="preemptive-title">
            <div className="group-heading"><span className="group-icon orange"><Layers3 size={19} aria-hidden="true" /></span><div><h3 id="preemptive-title">Preemptive / Queue-Based Missions</h3><p>Interruptions, time slices, and queue policies.</p></div><span className="group-count mono">05</span></div>
            {algorithms.filter(a => a.group === 'preemptive').map(a => <AlgorithmCard key={a.id} algorithm={a} />)}
          </section>
        </div>
      </section>
      <aside className="dashboard-aside" aria-label="Learning guide">
        <section className="panel objectives"><div className="objectives-header"><span className="eyebrow">MISSION OBJECTIVES</span><BookOpen size={18} aria-hidden="true" /></div><h2>Your briefing.<br />Your next discovery.</h2><p className="muted">The two learning outcomes of Lecture 5.</p>
          <ol>{learningObjectives.map((goal, index) => <li key={goal.title}><span className="objective-number mono">0{index + 1}</span><div><h3>{goal.title}</h3><p>{goal.description}</p></div></li>)}</ol>
          <Link to="/learn" className="text-link">Begin with the fundamentals <ArrowRight size={15} aria-hidden="true" /></Link>
        </section>
        <section className="key-concept"><Lightbulb size={20} aria-hidden="true" /><div><p className="eyebrow">THE BIG QUESTION</p><h3>Who gets the CPU next?</h3><p>CPU scheduling selects a process from the ready queue. The policy shapes waiting time, responsiveness, and fairness.</p></div></section>
        <div className="phase-note"><Check size={15} aria-hidden="true" /><span>Calculate, compare, learn, and save your scheduling missions.</span></div>
      </aside>
    </div>
    <Link to="/calculator" className="dashboard-bottom"><span><span className="mono">NEXT STEP</span> Set up your first process list</span><ChevronRight size={19} aria-hidden="true" /></Link>
  </>
}



