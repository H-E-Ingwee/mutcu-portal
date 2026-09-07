import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, Search, Lock } from 'lucide-react'

// Full MUTCU Constitution content — structured for display
// Source: MUTCU Constitution 2025
const CONSTITUTION_SECTIONS = [
  {
    id: 'preamble',
    title: 'Preamble',
    content: `We, The Christian Union —

ACKNOWLEDGE the sovereignty of God in creation, revelation, redemption and final judgement;

COMMITTED to deepen and strengthen the spiritual life of individuals, as members; witnesses of the Lord incarnate and seek to lead others to a personal faith in Him;

BOUND by the calling to live holy and righteous lives based on the Holy Bible and following the example of Jesus Christ;

APPRECIATE our ethnic, cultural, denominational and gender diversities, recognize The Christian Union as non-political, non-denominational and non-profit making society;

ADOPT, ENACT and give this constitution to ourselves and to the future generations of Murang'a University of Technology Christian Union.

GOD BLESS MUTCU`,
  },
  {
    id: 'supremacy',
    title: 'Supremacy Declaration',
    content: `We declare that the Holy Bible is supreme to this Constitution and binds all members of the Murang'a University of Technology Christian Union. Any provision that is inconsistent with the Holy Bible is void to the extent of its inconsistency, and any act of omission in contravention of the Holy Bible is invalid.`,
  },
  {
    id: 'chapter1',
    title: 'Chapter 1: Name, Vision, Aims & Doctrinal Basis',
    subsections: [
      { id: 'art1', title: 'Article 1: Name & Identity', content: `1.1 Name\nThe name of the Society shall be Murang'a University of Technology Christian Union (MUTCU) herein referred to as 'The Christian Union (C.U)'.\n\n1.2 Identity\nThe Christian Union shall have a logo that is a unique and memorable symbol that expresses our identity. The central cross signifies our Christ-centred foundation, while the four colourful quadrants represent the diversity of our members united as one body in Christ.` },
      { id: 'art2', title: 'Article 2: The Christian Union Motto', content: `Inspire Love, Hope and Godliness.` },
      { id: 'art3', title: 'Article 3: Registration', content: `The MUTCU shall be registered under the office of the Dean of Students of the Murang'a University of Technology.` },
      { id: 'art4', title: 'Article 4: Affiliation', content: `The Murang'a University of Technology Christian Union shall be affiliated to the Fellowship of Christian Unions (FOCUS Kenya).` },
      { id: 'art5', title: 'Article 5: Vision, Mission and Core Values', content: `5.1 Vision Statement\nTo be a model Christian union that cultivates Christ-centeredness among members to positively impact the society.\n\n5.2 Mission Statement\nRaising a Christ-like family, equipped in all aspects of life, by encouraging unity as one body and reaching out to non-believers within our community and beyond.\n\n5.3 Core Values\n1) Faith: We are rooted in the teachings of the Bible and a personal relationship with Jesus Christ.\n2) Love: We strive to demonstrate God's unconditional love through genuine fellowship and a welcoming heart for all.\n3) Hope: We aim to be a source of hope, inspiring our community through our positive words, encouraging actions, and unwavering faith.\n4) Godliness: We are committed to striving for lives that honour and glorify God in all that we do.\n5) Accountability: We shall demonstrate fellowship, support, and solidarity with one another, fostering welfare and unity within the Christian Union.\n6) Service: We believe in putting our faith into action by reaching out to serve the practical needs of others.` },
      { id: 'art6', title: 'Article 6: Aims of The Christian Union', content: `i. Discipleship — To deepen and strengthen the spiritual life of its members by the study of the Bible, prayer and Christian fellowship.\nii. Evangelism — To faithfully proclaim the gospel of Jesus Christ in word and deed.\niii. Mission Work — To share in the life of witnessing Christ by encouraging Christian Union members towards practical involvement.\niv. Leadership Development and Mentorship — To equip The Christian Union members through modelling and mentorship.` },
    ],
  },
  {
    id: 'chapter2',
    title: 'Chapter 2: Membership',
    subsections: [
      { id: 'art8', title: 'Article 8: Membership', content: `8.1 Membership\nMUTCU membership shall comprise of full membership, special membership and associate membership. There shall be no membership fee.\n\n8.2 Types of Membership\n\nI. Full Membership\nShall be open to all bona fide registered students of Murang'a University of Technology, who are born again and declare their faith in Lord Jesus. Members must consciously profess the following declaration:\n\n"I ______, in joining this Union, I declare my faith in Jesus Christ as my Savior, my Lord and God and it is my desire by the grace of God to live a life consistent with this declaration. I am also determined to give active support to The Christian Union as it seeks to fulfill its aims."\n\nA list of full members shall be kept by The Christian Union's secretary and this declaration shall be renewed annually during the AGM.\n\nII. Special Membership\nShall be open to all bona fide registered postgraduate and Open Distance and E-learning students of the university.\n\nIII. Associate Membership\nShall be open to former students of MUTCU who profess Jesus Christ as their personal Savior.\n\n8.3 Members' Rights and Responsibilities\n\nFull members:\na) Eligible to be nominated in the Christian Union leadership except for first, final year students and for anyone in the leadership of the Student Governing Council.\nb) Entitled to vote in any General meeting and to participate in the nomination of the officials of The Christian Union except for first years.\nc) Eligible to propose amendments in The Christian Union's constitution.\n\nSpecial members:\na) Eligible to vote in any General meeting but NOT to participate in the nomination of the officials.\nb) Entitled to participate in The Christian Union's activities.\n\n8.4 Loss of Membership\nA person shall lose membership upon:\na) Expulsion and or discontinuation from the University.\nb) Voluntary withdrawal by communication to the C.U's Executive Council in writing.\nc) If a member changes their faith.\nd) Contravention of Article 7 and/or conduct proven to contradict the Christian faith.\n\n8.5 Discipline and Disciplinary Actions\nThe Executive Council in consultation with the advisory board shall take disciplinary action against any member whom by belief or practice departs from the aims, objectives and the doctrinal basis of The Christian Union. The procedure is:\ni. A written and/or verbal complaint shall be submitted to and received by the Executive Committee.\nii. The Executive Council shall choose a team from amongst themselves which shall probe the said members and the witnesses.\niii. The Executive Council shall study the report and make a ruling in consultation with the advisory board.\niv. In case of confirmation of allegation, the Executive Council shall serve the member with a written warning.\nv. In case the member persists, the Executive Council shall deregister the member from The Christian Union's database.\nvi. If the member was a leader, they shall be stripped of their leadership position.\nvii. If the member continues in waywardness, the Executive Council shall publicly denounce them before the church.\nviii. The deregistered member will have the liberty to apply for registration through a written request to the Executive Council within 14 days.\nix. The Executive Council shall then make the final decision on whether to re-register the member.\nx. Following any disciplinary action, the Executive Committee shall make reasonable efforts to seek reconciliation and restoration with the member.` },
    ],
  },
  {
    id: 'chapter3',
    title: 'Chapter 3: Leadership & Governance',
    subsections: [
      { id: 'art9', title: 'Article 9: Governance', content: `The governance of the MUTCU shall be vested on three main organs:\n1. The Executive Council\n2. The Sub-Committees\n3. The Advisory Board` },
      { id: 'art12', title: 'Article 12: The Executive Council', content: `12.1 Composition\nThe Executive Council shall consist of:\ni. The Chairperson\nii. The First Vice Chairperson\niii. The Second Vice Chairperson\niv. Secretary\nv. Vice Secretary\nvi. Treasurer\nvii. Prayer Coordinator\nviii. Music Coordinator\nix. Missions and Evangelism Coordinator\nx. Bible Study and Training Coordinator\nxi. Discipleship Coordinator\nxii. Technical and Media Ministry Coordinator\nxiii. Creative Arts Ministry Coordinator\n\n12.4 Eligibility\na) Be a full member as indicated in article 8.2(I)\nb) Shall have completed one academic year as a student and shall not be a finalist in the University.\nc) Shall be a student by the time of the next duly constituted Annual General Meeting.\nd) Shall meet the Qualities of CU leaders as stipulated in the Leadership Manual.\n\n12.5 Terms of Service\na) Duly appointed council members shall hold their offices for one spiritual year.\nb) A member can be nominated for an office in the Executive Council for a maximum of two terms.\nc) The chairperson shall not serve for more than one term.\n\n12.9 Duties of The Executive Council Office Bearers\n\nA. The Chairperson\nThe Chairperson and the first Vice Chairperson shall not be of the same gender.\n\nB. The Office of the Vice Chairpersons\nIf the chairperson is a male the first vice chair shall be female and if the chairperson is a female, then the first vice chairperson shall be a male. The first and second vice chairpersons shall not be of the same gender.` },
    ],
  },
  {
    id: 'chapter5',
    title: 'Chapter 5: Nominations and Transitions',
    subsections: [
      { id: 'art17', title: 'Article 17: Nomination College (NC)', content: `i. Nominations shall be conducted by the Nomination College which shall consist of 12 finalists.\nii. All the finalists in the Executive Council shall be members of the Nomination College. The rest of the members shall be drawn from The Christian Union's ministries.\niii. The Nomination College shall be formed Fourteen (14) days before nomination day.\n\n17.1 Duties of the Nomination College\ni. Shall, during their first meeting nominate the chairperson and secretary of the commission.\nii. Shall lead the nominations exercise by the CU members during a Sunday Service.\niii. Shall prepare the materials for nomination, and issue them to the CU members and oversee the nomination process.\niv. Shall sensitize CU members before and during the nominations.\nv. Shall make the final appointment for each of the offices of the executive council.\nvi. Shall ensure that all offices whose appointments turndown the office are successfully replaced before the AGM.\nvii. Shall handle objections to any nominated member and take appropriate measures over such cases before the AGM.\n\n17.2 Nomination Process\ni. The nominations shall be held at-least 3 weeks before the AGM.\nii. The CU members shall be notified at least one week before the nomination exercise for prayer, fasting and meditation concerning the new Christian Union leadership.\niii. The full members of The Union shall be asked to recommend in writing to the Nomination College; persons they have prayerfully felt should form the next Executive Council in a general meeting.\niv. The Nomination College shall make final nominations for each of the offices of the Executive Council before the AGM. Names of the nominees will be made known to the members of the Union at least two weeks before the AGM for prayerful consideration.\nv. Objections to any nominated member shall be made in writing to the Nomination College.` },
      { id: 'art18', title: 'Article 18: By-Nominations', content: `18.1 Vacation of Office\nWhere a vacancy arises in the Executive Council due to resignation, termination, or any other cause, the Executive Council shall initiate a By-Nomination process.\n\n18.2 Procedure for Filling Vacancies\n1. A By-Nomination College of five (5) members shall be formed by the Executive Council.\n2. The process shall follow the procedure outlined in Article 17.2, adapted for the vacancy.\n3. Presentation and Objections:\n   i. The name of the nominee shall be made known to the members of the Union at least seven (7) days before their confirmation for prayerful consideration.\n   ii. Objections to the candidate must be made in writing by full members to the Chairperson of the By-Nomination College within a 3 days period.\n4. The By-Nomination College shall consider any objections and make a final decision on the appointment.\n5. The appointed member shall serve for the remainder of the spiritual year.\n6. Upon the successful appointment of the new member, the By-Nomination College shall be dissolved by the Executive Council after 7 days.` },
    ],
  },
  {
    id: 'chapter6',
    title: 'Chapter 6: Funds, Assets and Their Administration',
    subsections: [
      { id: 'art20', title: 'Article 20: Funds and Their Administration', content: `i. The funds of The Christian Union shall be used for the purpose which the Executive Council considers proper in accordance to the aims of The Christian Union.\nii. Any funds received by The Christian Union shall be deposited directly into The Christian Union's official bank account(s) or through The Christian Union's Treasurer.\niii. All Committees or ministries that handle any money shall have a treasurer who will keep proper records and shall report to the Executive Council treasurer.\niv. No payment shall be made out of the bank account without the resolution of the Executive Council.\nv. The Treasurer shall be a mandatory signatory to The CU's bank account.\nvi. The Chairperson and Secretary shall also be mandatory signatories.` },
    ],
  },
  {
    id: 'chapter8',
    title: 'Chapter 8: General Provisions',
    subsections: [
      { id: 'art29', title: 'Article 29: Official Communication', content: `Official notices for meetings, nominations, and other formal announcements shall be communicated via memo to members through the Secretaries via official Christian Union designated digital platforms. Communication through these channels shall be deemed to have been duly served.` },
      { id: 'art30', title: 'Article 30: Definition of Terms', content: `'MUTCU' or 'The Christian Union (C.U.)' — Murang'a University of Technology Christian Union.\n'AGM' — Annual General Meeting.\n'SGM' — Special General Meeting.\n'NC' — Nomination College responsible for overseeing nominations.\n'FOCUS Kenya' — Fellowship of Christian Unions, the national umbrella body.\n'Spiritual Year' — The period from the conclusion of one Annual General Meeting to the conclusion of the next.\n'Bona Fide Student' — An individual officially registered for a course of study at Murang'a University of Technology.\n'Executive Council' — The principal governing body of the Christian Union as outlined in Article 12.\n'Patron' — A member of the University teaching or administrative staff who serves as an advisor and liaison to the University.\n'Quorum' — The minimum number of members that must be present at a meeting for its proceedings to be valid.` },
    ],
  },
]

function Section({ section, searchTerm }) {
  const [open, setOpen] = useState(false)

  const matchesSearch = (text) => {
    if (!searchTerm) return true
    return text.toLowerCase().includes(searchTerm.toLowerCase())
  }

  const sectionMatches = matchesSearch(section.title) ||
    (section.content && matchesSearch(section.content)) ||
    (section.subsections || []).some(s => matchesSearch(s.title) || matchesSearch(s.content))

  if (searchTerm && !sectionMatches) return null

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-all text-left"
      >
        <div className="flex items-center gap-3">
          <BookOpen size={16} className="text-orange flex-shrink-0" />
          <span className="font-montserrat font-bold text-navy text-sm">{section.title}</span>
        </div>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100">
          {section.content && (
            <div className="px-5 py-4 bg-gray-50">
              <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-lato">{section.content}</pre>
            </div>
          )}
          {section.subsections && section.subsections.map(sub => {
            if (searchTerm && !matchesSearch(sub.title) && !matchesSearch(sub.content)) return null
            return (
              <SubSection key={sub.id} sub={sub} searchTerm={searchTerm} />
            )
          })}
        </div>
      )}
    </div>
  )
}

function SubSection({ sub, searchTerm }) {
  const [open, setOpen] = useState(!!searchTerm)
  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3 bg-white hover:bg-gray-50 transition-all text-left"
      >
        <span className="font-semibold text-navy text-sm pl-5">{sub.title}</span>
        {open ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 py-4 bg-blue-50/30 border-t border-gray-100">
          <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-lato pl-5">{sub.content}</pre>
        </div>
      )}
    </div>
  )
}

export default function Constitution() {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-header">
        <div>
          <h1 className="page-title">MUTCU Constitution</h1>
          <p className="page-subtitle">Murang'a University of Technology Christian Union — Constitution 2025</p>
        </div>
        <div className="flex items-center gap-2 bg-orange/10 border border-orange/20 rounded-lg px-3 py-2">
          <Lock size={14} className="text-orange" />
          <span className="text-xs text-orange font-semibold">View Only — No Download</span>
        </div>
      </div>

      {/* Header card */}
      <div className="card p-5 mb-5 bg-gradient-to-r from-navy to-[#0a0060] text-white">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen size={20} className="text-orange" />
          <div>
            <div className="font-montserrat font-bold text-lg">MUTCU Constitution, 2025</div>
            <div className="text-white/60 text-xs">© 2025 Murang'a University of Technology Christian Union. All rights reserved.</div>
          </div>
        </div>
        <p className="text-white/70 text-xs italic mt-2">
          "Inspire Love, Hope & Godliness" — The Holy Bible is supreme to this Constitution and binds all members.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          className="form-input pl-10"
          placeholder="Search the constitution..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Sections */}
      <div>
        {CONSTITUTION_SECTIONS.map(section => (
          <Section key={section.id} section={section} searchTerm={searchTerm} />
        ))}
      </div>

      <div className="text-center text-xs text-gray-400 mt-6 pb-4">
        This is the official MUTCU Constitution 2025. For amendments, refer to Article 23.
        <br />© 2025 Murang'a University of Technology Christian Union. All rights reserved.
      </div>
    </div>
  )
}