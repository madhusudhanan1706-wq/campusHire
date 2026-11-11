(() => {
    'use strict';

    const STORAGE_KEY = 'campusHireStateV1';
    const ACCOUNTS_KEY = 'campusHireAccountsV1';
    const SESSION_KEY = 'campusHireSessionV1';
    const DATABASE_API = '/api/state';
    const statuses = ['Applied', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'];
    const branches = ['BA', 'BCom', 'BBA', 'BSW', 'BJMC', 'BA_LLB', 'BFA', 'BDes'];
    const defaultProfile = {
        fullName: '', rollNo: '', email: '', phone: '', college: '', degree: '',
        branch: '', batch: '', cgpa: '', tenth: '', twelfth: '', backlogs: '',
        skills: [], resumeUrl: '', resumeName: '', resumeDataUrl: '', githubUrl: '', linkedinUrl: ''
    };

    const day = (offset) => {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        return date.toISOString().slice(0, 10);
    };

    const initialDrives = [
        { company: 'Google', role: 'People Operations Associate', industry: 'People & Culture', location: 'Bangalore', ctc: 12, minCgpa: 7, maxBacklogs: 0, branches: ['BA', 'BBA', 'BSW', 'BA_LLB'], days: 8, description: 'Support employee programs, recruiting coordination, and people operations across a collaborative workplace.', skills: ['Communication', 'Research', 'Organization'], rounds: ['Application review', 'Situational interview', 'People team interview'] },
        { company: 'Microsoft', role: 'Communications Specialist', industry: 'Communications', location: 'Hyderabad', ctc: 14, minCgpa: 7, maxBacklogs: 0, branches: ['BA', 'BJMC', 'BBA'], days: 12, description: 'Help shape clear internal and customer communications through writing, editorial review, and campaign support.', skills: ['Writing', 'Editing', 'Presentation'], rounds: ['Writing exercise', 'Portfolio discussion', 'Team interview'] },
        { company: 'Amazon', role: 'Content & Editorial Associate', industry: 'Media & E-commerce', location: 'Bangalore / Hyderabad', ctc: 10, minCgpa: 6.5, maxBacklogs: 0, branches: ['BA', 'BJMC', 'BFA', 'BDes'], days: 16, description: 'Review and improve digital catalog content, coordinate editorial updates, and maintain consistent content quality.', skills: ['Writing', 'Attention to detail', 'Content management'], rounds: ['Language assessment', 'Editorial exercise', 'Team interview'] },
        { company: 'Cisco', role: 'Business Development Associate', industry: 'Business & Partnerships', location: 'Bangalore', ctc: 11, minCgpa: 6.5, maxBacklogs: 1, branches: ['BBA', 'BCom', 'BA', 'BA_LLB'], days: 20, description: 'Research prospective partners, prepare client materials, and help coordinate business development activity.', skills: ['Research', 'Communication', 'Negotiation'], rounds: ['Aptitude assessment', 'Case discussion', 'HR interview'] },
        { company: 'Zoho', role: 'Customer Success Executive', industry: 'Customer Experience', location: 'Chennai', ctc: 8, minCgpa: 6.5, maxBacklogs: 0, branches: ['BA', 'BBA', 'BCom', 'BSW'], days: 24, description: 'Help customers get value from business products through clear guidance, follow-up, and practical problem-solving.', skills: ['Communication', 'Customer service', 'Problem solving'], rounds: ['Communication exercise', 'Customer scenario', 'Team interview'] },
        { company: 'Infosys', role: 'Talent Acquisition Coordinator', industry: 'Human Resources', location: 'Mysore / Bangalore', ctc: 7, minCgpa: 6, maxBacklogs: 1, branches: ['BA', 'BBA', 'BSW', 'BA_LLB'], days: 28, description: 'Coordinate candidate communication, interview schedules, and recruitment operations for campus and early-career hiring.', skills: ['Organization', 'Communication', 'Coordination'], rounds: ['Application review', 'Recruitment scenario', 'HR interview'] },
        { company: 'TCS Digital', role: 'Financial Operations Associate', industry: 'Finance & Operations', location: 'Pan India', ctc: 6.5, minCgpa: 6.5, maxBacklogs: 0, branches: ['BCom', 'BBA', 'BA'], days: 32, description: 'Support reporting, reconciliations, and operational processes with careful analysis and clear documentation.', skills: ['Excel', 'Numeracy', 'Attention to detail'], rounds: ['Numerical assessment', 'Operations exercise', 'Manager interview'] },
        { company: 'Deloitte', role: 'Research & Insights Analyst', industry: 'Research & Consulting', location: 'Bangalore / Hyderabad', ctc: 9, minCgpa: 7, maxBacklogs: 0, branches: ['BA', 'BCom', 'BBA', 'BJMC'], days: 36, description: 'Gather and synthesize market information, prepare concise reports, and support research-led client work.', skills: ['Research', 'Writing', 'Data interpretation'], rounds: ['Research task', 'Case interview', 'Team discussion'] }
    ].map((drive, index) => ({
        ...drive,
        id: `drive-${index + 1}`,
        deadline: day(drive.days),
        driveDate: day(drive.days + 7),
        logoColor: ['#2563eb', '#0f766e', '#f59e0b', '#0891b2', '#7c3aed', '#2563eb', '#dc2626', '#0f766e'][index]
    }));

    function readState() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved && Array.isArray(saved.drives) && Array.isArray(saved.applications) && saved.profile) {
                return { profile: { ...defaultProfile }, drives: saved.drives, applications: [], adminMode: Boolean(saved.adminMode) };
            }
        } catch (error) {
            console.warn('CampusHire could not read saved data:', error);
        }
        return { profile: { ...defaultProfile }, drives: initialDrives, applications: [], adminMode: false };
    }

    let state = readState();
    let activeAccountEmail = null;
    let activeDriveId = null;
    let activeApplicationId = null;
    let skills = [...(state.profile.skills || [])];
    let databaseAvailable = false;
    let databaseWarningShown = false;
    let databaseSaveQueue = Promise.resolve();

    const $ = (id) => document.getElementById(id);
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    function readAccounts() {
        try {
            const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
            return accounts && typeof accounts === 'object' && !Array.isArray(accounts) ? accounts : {};
        } catch (error) {
            return {};
        }
    }
    function hasCompleteProfile(profile) {
        return Boolean(
            profile.fullName && profile.rollNo && profile.email && profile.phone && profile.degree &&
            profile.college && profile.branch && profile.batch && Number(profile.cgpa) > 0 &&
            profile.tenth !== '' && profile.twelfth !== '' && profile.backlogs !== '' &&
            (profile.resumeUrl || profile.resumeDataUrl || profile.resumeName) &&
            Array.isArray(profile.skills) && profile.skills.length
        );
    }
    function enterAccount(email) {
        const account = readAccounts()[email];
        if (!account) return;
        activeAccountEmail = email;
        state.profile = {
            ...defaultProfile,
            ...(account.profile || {}),
            fullName: account.profile?.fullName || account.name || '',
            email: account.profile?.email || email
        };
        state.applications = Array.isArray(account.applications) ? account.applications : [];
        skills = [...(state.profile.skills || [])];
        document.body.classList.add('is-authenticated');
        const complete = hasCompleteProfile(state.profile);
        document.body.classList.toggle('profile-incomplete', !complete);
        populateProfile();
        renderEverything();
        switchTab(complete ? 'drives' : 'profile');
    }
    const money = (value) => `${Number(value).toFixed(1)} LPA`;
    const dateLabel = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set';
    const isOpen = (drive) => drive.deadline >= day(0);
    const getDrive = (id) => state.drives.find((drive) => drive.id === id);
    const saveState = () => {
        if (activeAccountEmail) {
            try {
                const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
                const account = accounts[activeAccountEmail];
                if (account) {
                    account.profile = state.profile;
                    account.applications = state.applications;
                    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
                }
            } catch (error) {
                console.warn('CampusHire could not save this account profile:', error);
            }
        }
        const sharedState = { profile: { ...defaultProfile }, drives: state.drives, applications: [], adminMode: state.adminMode };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedState));
        } catch (error) {
            console.warn('CampusHire could not update browser storage:', error);
        }
        if (databaseAvailable) {
            const snapshot = JSON.stringify(sharedState);
            databaseSaveQueue = databaseSaveQueue.then(async () => {
                const response = await fetch(DATABASE_API, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ state: JSON.parse(snapshot) })
                });
                if (!response.ok) throw new Error(`Database save failed (${response.status})`);
            }).catch((error) => {
                databaseAvailable = false;
                console.error('CampusHire database save failed:', error);
                if (!databaseWarningShown) {
                    databaseWarningShown = true;
                    showToast('Database connection lost. Changes are being kept in this browser only.', 'error');
                }
            });
        }
        return true;
    };

    async function loadDatabaseState() {
        const response = await fetch(DATABASE_API, { headers: { Accept: 'application/json' } });
        if (!response.ok) throw new Error(`Database request failed (${response.status})`);
        const payload = await response.json();
        databaseAvailable = true;
        if (payload.state && Array.isArray(payload.state.drives) && Array.isArray(payload.state.applications) && payload.state.profile) {
            state.drives = payload.state.drives;
            state.adminMode = Boolean(payload.state.adminMode);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: { ...defaultProfile }, drives: state.drives, applications: [], adminMode: state.adminMode })); } catch (error) { console.warn('CampusHire browser cache is unavailable:', error); }
        } else {
            const response = await fetch(DATABASE_API, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state })
            });
            if (!response.ok) throw new Error(`Database initialization failed (${response.status})`);
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        $('toastContainer').append(toast);
        window.setTimeout(() => toast.remove(), 3600);
    }

    function openModal(id) {
        const modal = $(id);
        if (!modal) return;
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        const focusTarget = modal.querySelector('input, button, select, textarea');
        if (focusTarget) focusTarget.focus({ preventScroll: true });
    }

    function closeModal(modal) {
        if (typeof modal === 'string') modal = $(modal);
        if (modal) modal.classList.remove('active');
        if (!document.querySelector('.modal-overlay.active')) document.body.style.overflow = '';
    }

    function switchTab(tab) {
        if (!['drives', 'profile', 'applications'].includes(tab)) return;
        if (document.body.classList.contains('profile-incomplete') && tab !== 'profile') return;
        document.querySelectorAll('.view-section').forEach((section) => section.classList.toggle('active', section.id === `view-${tab}`));
        document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
        if (tab === 'applications') renderApplications();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.switchTab = switchTab;

    function eligibility(drive, profile = state.profile) {
        const reasons = [];
        const cgpa = Number(profile.cgpa);
        const backlogs = Number(profile.backlogs);
        if (!isOpen(drive)) reasons.push('The application deadline has passed.');
        if (!drive.branches.includes('All Branches') && !drive.branches.includes(profile.branch)) reasons.push(`Your ${profile.branch || 'selected'} branch is not listed.`);
        if (!Number.isFinite(cgpa) || cgpa < Number(drive.minCgpa)) reasons.push(`Minimum CGPA is ${drive.minCgpa}.`);
        if (!Number.isFinite(backlogs) || backlogs > Number(drive.maxBacklogs)) reasons.push(`Maximum allowed backlogs: ${drive.maxBacklogs}.`);
        return { eligible: reasons.length === 0, reasons };
    }

    function renderStats() {
        const openDrives = state.drives.filter(isOpen);
        $('statActiveDrives').textContent = openDrives.length;
        $('statMaxCtc').textContent = openDrives.length ? money(Math.max(...openDrives.map((drive) => Number(drive.ctc)))) : '0 LPA';
        $('statAvgCtc').textContent = openDrives.length ? money(openDrives.reduce((sum, drive) => sum + Number(drive.ctc), 0) / openDrives.length) : '0 LPA';
        $('navAppCount').textContent = state.applications.length;
        $('navAppCount').style.display = state.applications.length ? 'inline-block' : 'none';
        $('appliedCountBadge').textContent = `${state.applications.length} Applied`;
    }

    function renderDrives() {
        const search = $('searchDriveInput').value.trim().toLowerCase();
        const branch = $('filterBranch').value;
        const eligibleOnly = $('filterEligibleOnly').checked;
        const sort = $('sortDrives').value;
        let drives = state.drives.filter((drive) => {
            const matchesSearch = `${drive.company} ${drive.role} ${drive.industry} ${drive.location} ${(drive.skills || []).join(' ')}`.toLowerCase().includes(search);
            const matchesBranch = branch === 'all' || drive.branches.includes('All Branches') || drive.branches.includes(branch);
            const matchesEligibility = !eligibleOnly || eligibility(drive).eligible;
            return matchesSearch && matchesBranch && matchesEligibility;
        });
        drives = [...drives];
        if (sort === 'ctcHigh') drives.sort((a, b) => Number(b.ctc) - Number(a.ctc));
        if (sort === 'ctcLow') drives.sort((a, b) => Number(a.ctc) - Number(b.ctc));
        if (sort === 'deadline') drives.sort((a, b) => a.deadline.localeCompare(b.deadline));
        if (sort === 'company') drives.sort((a, b) => a.company.localeCompare(b.company));

        $('drivesCountLabel').textContent = `${drives.length} ${drives.length === 1 ? 'drive' : 'drives'} found`;
        const container = $('drivesContainer');
        if (!drives.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">⌕</div><h3>No matching drives</h3><p>Try changing your search or filters to see more placement opportunities.</p><button class="btn btn-outline btn-sm" type="button" data-action="clear-filters">Clear filters</button></div>';
            return;
        }
        container.innerHTML = drives.map((drive) => {
            const match = eligibility(drive);
            const application = state.applications.find((item) => item.driveId === drive.id);
            const branchPills = drive.branches.includes('All Branches') ? '<span class="pill">All Branches</span>' : drive.branches.map((name) => `<span class="pill ${name === state.profile.branch ? (match.eligible ? 'match' : 'mismatch') : ''}">${escapeHtml(name)}</span>`).join('');
            return `<article class="drive-card">
				<div class="drive-card-header"><div class="company-logo" style="background:${escapeHtml(drive.logoColor || '#2563eb')}">${escapeHtml(drive.company.slice(0, 1).toUpperCase())}</div>
					<div class="company-meta"><h3>${escapeHtml(drive.company)}</h3><div class="company-role">${escapeHtml(drive.role)}</div><div class="company-industry">${escapeHtml(drive.industry || 'Recruitment Drive')}</div></div>
					<span class="status-badge ${application ? 'applied' : (isOpen(drive) ? 'open' : 'closed')}">${application ? 'Applied' : (isOpen(drive) ? 'Open' : 'Closed')}</span></div>
				<div class="drive-highlights"><div class="highlight-item"><span class="highlight-label">Package (CTC)</span><span class="highlight-val ctc">${money(drive.ctc)}</span></div><div class="highlight-item"><span class="highlight-label">Location</span><span class="highlight-val">${escapeHtml(drive.location)}</span></div><div class="highlight-item"><span class="highlight-label">Minimum CGPA</span><span class="highlight-val">${escapeHtml(drive.minCgpa)}</span></div><div class="highlight-item"><span class="highlight-label">Max Backlogs</span><span class="highlight-val">${escapeHtml(drive.maxBacklogs)}</span></div></div>
				<div class="drive-eligibility"><strong>${match.eligible ? 'Eligibility: You match' : 'Eligible branches'}</strong><div class="eligibility-tags">${branchPills}</div></div>
				<div class="drive-card-footer"><span class="deadline-note">Deadline: ${dateLabel(drive.deadline)}</span><div style="display:flex;gap:.5rem"><button type="button" class="btn btn-outline btn-sm" data-action="details" data-id="${escapeHtml(drive.id)}">Details</button><button type="button" class="btn btn-primary btn-sm" data-action="apply" data-id="${escapeHtml(drive.id)}" ${application || !match.eligible ? 'disabled' : ''}>${application ? 'Applied' : (!isOpen(drive) ? 'Closed' : 'Apply Now')}</button></div></div>
			</article>`;
        }).join('');
    }

    function readProfileForm() {
        return {
            fullName: $('profFullName').value.trim(), rollNo: $('profRollNo').value.trim(), email: $('profEmail').value.trim(),
            phone: $('profPhone').value.trim(), college: $('profCollege').value.trim(), degree: $('profDegree').value,
            branch: $('profBranch').value, batch: $('profBatch').value.trim(), cgpa: $('profCgpa').value,
            tenth: $('profTenth').value, twelfth: $('profTwelfth').value, backlogs: $('profBacklogs').value,
            skills: [...skills], resumeUrl: $('profResumeUrl').value.trim(), resumeName: state.profile.resumeName || '',
            resumeDataUrl: state.profile.resumeDataUrl || '', githubUrl: $('profGithubUrl').value.trim(), linkedinUrl: $('profLinkedinUrl').value.trim()
        };
    }

    function renderSkills() {
        const container = $('skillsContainer');
        container.innerHTML = `${skills.map((skill, index) => `<span class="skill-tag">${escapeHtml(skill)}<button type="button" class="skill-tag-remove" aria-label="Remove ${escapeHtml(skill)}" data-skill-index="${index}">&times;</button></span>`).join('')}<input type="text" id="skillsInputField" class="skills-input-field" placeholder="Add skill (e.g. React, Java, Docker)...">`;
        $('skillsInputField').addEventListener('keydown', onSkillKeydown);
    }

    function onSkillKeydown(event) {
        if (!['Enter', ','].includes(event.key)) return;
        event.preventDefault();
        const input = event.currentTarget;
        const skill = input.value.replace(/,/g, '').trim();
        if (skill && !skills.some((item) => item.toLowerCase() === skill.toLowerCase())) {
            skills.push(skill);
            renderSkills();
            $('skillsInputField').focus();
            updateProfileCompleteness();
        }
    }

    function updateProfileCompleteness(profile = readProfileForm()) {
        const checks = [
            ['checkPersonal', Boolean(profile.fullName && profile.email && profile.phone && profile.rollNo)],
            ['checkAcademic', Boolean(profile.degree && profile.branch && profile.batch && Number(profile.cgpa) > 0)],
            ['checkSkills', profile.skills.length > 0],
            ['checkResume', Boolean(profile.resumeUrl || profile.resumeDataUrl || profile.resumeName)],
            ['checkLinks', Boolean(profile.githubUrl || profile.linkedinUrl)]
        ];
        checks.forEach(([id, done]) => {
            const item = $(id);
            item.classList.toggle('done', done);
            item.querySelector('.icon').textContent = done ? '✓' : '○';
        });
        const score = Math.round(checks.filter(([, done]) => done).length * 20);
        $('profileScoreNum').textContent = `${score}%`;
        $('profileProgressBar').style.width = `${score}%`;
        $('profileProgressBar').parentElement.nextElementSibling.textContent = score === 100 ? 'Application Ready' : 'Complete your profile';
    }

    function populateProfile() {
        const profile = state.profile;
        const fields = {
            profFullName: profile.fullName, profRollNo: profile.rollNo, profEmail: profile.email, profPhone: profile.phone,
            profCollege: profile.college, profDegree: profile.degree, profBranch: profile.branch, profBatch: profile.batch,
            profCgpa: profile.cgpa, profTenth: profile.tenth, profTwelfth: profile.twelfth, profBacklogs: profile.backlogs,
            profResumeUrl: profile.resumeUrl, profGithubUrl: profile.githubUrl, profLinkedinUrl: profile.linkedinUrl
        };
        Object.entries(fields).forEach(([id, value]) => { $(id).value = value ?? ''; });
        skills = [...(profile.skills || [])];
        renderSkills();
        $('headerStudentName').textContent = profile.fullName || 'Student';
        $('headerAvatar').textContent = (profile.fullName || 'S').trim().slice(0, 1).toUpperCase();
        updateProfileCompleteness(profile);
    }

    function renderApplications() {
        const container = $('applicationsContainer');
        $('appliedCountBadge').textContent = `${state.applications.length} Applied`;
        if (!state.applications.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">▤</div><h3>No applications yet</h3><p>Your submitted placement applications and status updates will appear here.</p><button class="btn btn-primary btn-sm" type="button" onclick="switchTab(\'drives\')">Browse Drives</button></div>';
            return;
        }
        const rows = [...state.applications].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt)).map((application) => {
            const drive = getDrive(application.driveId) || application.driveSnapshot;
            const statusClass = ({ 'Applied': 'status-applied', 'Shortlisted': 'status-shortlisted', 'Interview Scheduled': 'status-interview', 'Selected': 'status-selected', 'Rejected': 'status-rejected' })[application.status] || 'status-applied';
            return `<tr><td><strong>${escapeHtml(drive.company)}</strong><br><span style="color:var(--text-muted)">${escapeHtml(drive.role)}</span></td><td>${money(drive.ctc)}</td><td>${dateLabel(application.appliedAt.slice(0, 10))}</td><td><span class="status-pill ${statusClass}">${escapeHtml(application.status)}</span></td><td><button class="btn btn-outline btn-sm" type="button" data-action="slip" data-id="${escapeHtml(application.id)}">View Slip</button></td></tr>`;
        }).join('');
        container.innerHTML = `<div class="table-container"><table class="app-table"><thead><tr><th>Company & Role</th><th>Package</th><th>Applied On</th><th>Status</th><th>Receipt</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    }

    function fillApplyModal(drive) {
        activeDriveId = drive.id;
        $('applyModalCompany').textContent = drive.company;
        $('applyModalRole').textContent = drive.role;
        $('applyModalLocation').textContent = `📍 ${drive.location}`;
        $('applyModalCtc').textContent = money(drive.ctc);
        $('applyCandidateName').textContent = state.profile.fullName || 'Not provided';
        $('applyCandidateRoll').textContent = state.profile.rollNo || 'Not provided';
        $('applyCandidateBranch').textContent = state.profile.branch || 'Not provided';
        $('applyCandidateCgpa').textContent = `${state.profile.cgpa || 'Not provided'} CGPA`;
        $('applyCandidateBacklogs').textContent = state.profile.backlogs || '0';
        $('applyCandidateResume').textContent = state.profile.resumeName || state.profile.resumeUrl || 'Not attached';
        $('applyCoverNote').value = '';
        const result = eligibility(drive);
        const box = $('applyEligibilityBox');
        box.classList.toggle('eligible', result.eligible);
        box.classList.toggle('ineligible', !result.eligible);
        box.querySelector('.icon').textContent = result.eligible ? '✓' : '!';
        $('applyEligibilityText').innerHTML = result.eligible
            ? '<strong>Eligible for this drive!</strong> Your profile matches all academic requirements.'
            : `<strong>Not currently eligible.</strong> ${result.reasons.map(escapeHtml).join(' ')}`;
        $('confirmApplyBtn').disabled = !result.eligible;
        openModal('applyModal');
    }

    function showDriveDetails(drive) {
        activeDriveId = drive.id;
        $('detailModalCompany').textContent = drive.company;
        $('detailModalRole').textContent = drive.role;
        $('detailModalCtc').textContent = money(drive.ctc);
        $('detailModalLocation').textContent = drive.location;
        $('detailModalMinCgpa').textContent = drive.minCgpa;
        $('detailModalBacklogs').textContent = drive.maxBacklogs;
        $('detailModalBranches').textContent = drive.branches.includes('All Branches') ? 'All Branches' : drive.branches.join(', ');
        $('detailModalDeadline').textContent = dateLabel(drive.deadline);
        $('detailModalDriveDate').textContent = dateLabel(drive.driveDate);
        $('detailModalDesc').textContent = drive.description || 'Details will be shared by the placement office.';
        $('detailModalRounds').innerHTML = (drive.rounds?.length ? drive.rounds : ['Selection rounds to be announced']).map((round) => `<li>${escapeHtml(round)}</li>`).join('');
        const application = state.applications.some((item) => item.driveId === drive.id);
        const applyButton = $('detailModalApplyBtn');
        applyButton.disabled = application || !eligibility(drive).eligible;
        applyButton.textContent = application ? 'Already Applied' : (!isOpen(drive) ? 'Applications Closed' : 'Apply Now');
        openModal('driveDetailModal');
    }

    function showApplicationSlip(application) {
        const drive = getDrive(application.driveId) || application.driveSnapshot;
        const person = application.profileSnapshot || state.profile;
        activeApplicationId = application.id;
        const fields = {
            slipAppId: application.id, slipCompany: drive.company, slipRole: drive.role, slipCtc: money(drive.ctc),
            slipDate: dateLabel(application.appliedAt.slice(0, 10)), slipCandidateName: person.fullName,
            slipCandidateRoll: person.rollNo, slipCandidateBranch: person.branch, slipCandidateCgpa: person.cgpa,
            slipCandidateResume: person.resumeName || person.resumeUrl || 'Not attached', slipCoverNote: application.coverNote || 'None'
        };
        Object.entries(fields).forEach(([id, value]) => { $(id).textContent = value || 'Not provided'; });
        const statusClass = ({ 'Applied': 'status-applied', 'Shortlisted': 'status-shortlisted', 'Interview Scheduled': 'status-interview', 'Selected': 'status-selected', 'Rejected': 'status-rejected' })[application.status] || 'status-applied';
        $('slipStatus').innerHTML = `<span class="status-pill ${statusClass}">${escapeHtml(application.status)}</span>`;
        openModal('appSlipModal');
    }

    function onProfileSubmit(event) {
        event.preventDefault();
        const profile = readProfileForm();
        if (!event.currentTarget.reportValidity()) return;
        if (!hasCompleteProfile(profile)) {
            showToast('Complete your contact, academic, skills, and resume details before entering CampusHire.', 'error');
            return;
        }
        if (!profile.resumeUrl && !profile.resumeDataUrl && !profile.resumeName) {
            showToast('Add a resume link or attach a resume file before saving.', 'error');
            $('profResumeUrl').focus();
            return;
        }
        if (profile.resumeUrl && !/^https?:\/\//i.test(profile.resumeUrl)) {
            showToast('Resume links must start with http:// or https://.', 'error');
            $('profResumeUrl').focus();
            return;
        }
        state.profile = profile;
        saveState();
        populateProfile();
        renderDrives();
        document.body.classList.remove('profile-incomplete');
        switchTab('drives');
        showToast('Student profile saved.', 'success');
    }

    function onAddDrive(event) {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        const selectedBranches = [...$('newDriveBranches').selectedOptions].map((option) => option.value);
        const chosenBranches = selectedBranches.includes('All Branches') || !selectedBranches.length ? ['All Branches'] : selectedBranches;
        const drive = {
            id: `drive-${Date.now()}`, company: $('newDriveCompany').value.trim(), role: $('newDriveRole').value.trim(),
            industry: 'Campus Recruitment', location: $('newDriveLocation').value.trim() || 'To be announced',
            ctc: parseFloat($('newDriveCtc').value.replace(',', '.').match(/[\d.]+/)?.[0]),
            minCgpa: Number($('newDriveMinCgpa').value), maxBacklogs: Number($('newDriveBacklogs').value || 0),
            branches: chosenBranches, deadline: $('newDriveDeadline').value, driveDate: $('newDriveDeadline').value,
            description: $('newDriveDesc').value.trim(), skills: [], rounds: ['Selection process to be announced'], logoColor: '#0f766e'
        };
        if (!Number.isFinite(drive.ctc) || drive.ctc <= 0) {
            showToast('Enter a valid annual package, such as 12 LPA.', 'error');
            $('newDriveCtc').focus();
            return;
        }
        state.drives.unshift(drive);
        saveState();
        form.reset();
        $('newDriveLocation').value = 'Bangalore';
        $('newDriveMinCgpa').value = '7.0';
        $('newDriveBacklogs').value = '0';
        $('newDriveBranches').options[0].selected = true;
        closeModal('addDriveModal');
        renderEverything();
        showToast(`${drive.company} drive published.`, 'success');
    }

    function exportCsv() {
        if (!state.applications.length) {
            showToast('There are no applicants to export yet.', 'info');
            return;
        }
        const columns = ['Application ID', 'Student Name', 'Roll No', 'Email', 'Phone', 'Branch', 'Degree', 'Batch', 'CGPA', 'Backlogs', 'Skills', 'Resume', 'Company', 'Role', 'CTC (LPA)', 'Applied On', 'Status', 'Cover Note'];
        const csvCell = (value) => {
            let text = String(value ?? '');
            if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
            return `"${text.replace(/"/g, '""')}"`;
        };
        const rows = state.applications.map((application) => {
            const person = application.profileSnapshot || state.profile;
            const drive = getDrive(application.driveId) || application.driveSnapshot;
            return [application.id, person.fullName, person.rollNo, person.email, person.phone, person.branch, person.degree, person.batch, person.cgpa, person.backlogs, (person.skills || []).join('; '), person.resumeName || person.resumeUrl, drive.company, drive.role, drive.ctc, application.appliedAt, application.status, application.coverNote];
        });
        const blob = new Blob(['\ufeff', [columns, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `campushire-applicants-${day(0)}.csv`;
        document.body.append(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast('Applicant CSV downloaded.', 'success');
    }

    function renderEverything() {
        renderStats();
        renderDrives();
        renderApplications();
    }

    function bindEvents() {
        const setAuthMode = (mode) => {
            const signup = mode === 'signup';
            $('loginForm').hidden = signup;
            $('signupForm').hidden = !signup;
            $('showLoginBtn').classList.toggle('active', !signup);
            $('showSignupBtn').classList.toggle('active', signup);
            $('showLoginBtn').setAttribute('aria-pressed', String(!signup));
            $('showSignupBtn').setAttribute('aria-pressed', String(signup));
            $('authEyebrow').textContent = signup ? 'MAKE YOUR NEXT MOVE' : 'YOUR CAREER, IN MOTION';
            $('authTitle').textContent = signup ? 'Create account' : 'Sign in';
            $('authSubtitle').textContent = signup ? 'Set up your student access in a moment.' : 'Pick up where your next opportunity begins.';
            $('loginMessage').textContent = '';
            $('signupMessage').textContent = '';
        };
        const derivePasswordHash = async (password, salt) => {
            const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
            const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, key, 256);
            return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('');
        };
        const openCampusHire = (email) => {
            try { sessionStorage.setItem(SESSION_KEY, email); } catch (error) { /* Session storage may be disabled. */ }
            enterAccount(email);
        };
        $('showLoginBtn').addEventListener('click', () => setAuthMode('login'));
        $('showSignupBtn').addEventListener('click', () => setAuthMode('signup'));
        $('signupForm').addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = $('signupEmail').value.trim().toLowerCase();
            const password = $('signupPassword').value;
            const message = $('signupMessage');
            const accounts = readAccounts();
            if (accounts[email]) {
                message.textContent = 'An account already exists for this email. Sign in instead.';
                message.classList.add('error');
                return;
            }
            try {
                const salt = crypto.getRandomValues(new Uint8Array(16));
                const hash = await derivePasswordHash(password, salt);
                accounts[email] = { name: $('signupName').value.trim(), salt: Array.from(salt), hash, profile: null, applications: [] };
                localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
                openCampusHire(email);
            } catch (error) {
                message.textContent = 'Account setup is unavailable in this browser. Open the site through its local server and try again.';
                message.classList.add('error');
            }
        });
        $('loginForm').addEventListener('submit', async (event) => {
            event.preventDefault();
            const email = $('loginEmail').value.trim().toLowerCase();
            const password = $('loginPassword').value;
            const message = $('loginMessage');
            const account = readAccounts()[email];
            if (!account) {
                message.textContent = 'Email or password is incorrect.';
                message.classList.add('error');
                return;
            }
            try {
                const hash = await derivePasswordHash(password, new Uint8Array(account.salt));
                if (hash !== account.hash) {
                    message.textContent = 'Email or password is incorrect.';
                    message.classList.add('error');
                    return;
                }
                openCampusHire(email);
            } catch (error) {
                message.textContent = 'Sign-in is unavailable in this browser. Please try again through the local server.';
                message.classList.add('error');
            }
        });
        $('signOutBtn').addEventListener('click', () => {
            try { sessionStorage.removeItem(SESSION_KEY); } catch (error) { /* Session storage may be disabled. */ }
            document.body.classList.remove('is-authenticated');
            setAuthMode('login');
            $('loginPassword').value = '';
        });
        document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
        $('headerAvatarBtn').addEventListener('click', () => switchTab('profile'));
        ['searchDriveInput', 'filterBranch', 'sortDrives', 'filterEligibleOnly'].forEach((id) => $(id).addEventListener(id === 'searchDriveInput' ? 'input' : 'change', renderDrives));
        $('drivesContainer').addEventListener('click', (event) => {
            const button = event.target.closest('[data-action]');
            if (!button) return;
            if (button.dataset.action === 'clear-filters') {
                $('searchDriveInput').value = '';
                $('filterBranch').value = 'all';
                $('filterEligibleOnly').checked = false;
                $('sortDrives').value = 'recommended';
                renderDrives();
                return;
            }
            const drive = getDrive(button.dataset.id);
            if (!drive) return;
            if (button.dataset.action === 'details') showDriveDetails(drive);
            if (button.dataset.action === 'apply') fillApplyModal(drive);
        });
        $('studentProfileForm').addEventListener('submit', onProfileSubmit);
        $('studentProfileForm').addEventListener('input', () => updateProfileCompleteness());
        $('skillsContainer').addEventListener('click', (event) => {
            const removeButton = event.target.closest('[data-skill-index]');
            if (!removeButton) return;
            skills.splice(Number(removeButton.dataset.skillIndex), 1);
            renderSkills();
            updateProfileCompleteness();
        });
        $('profResumeFile').addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
                showToast('Choose a PDF, DOC, or DOCX resume.', 'error');
                event.target.value = '';
                return;
            }
            if (file.size > 1024 * 1024) {
                showToast('For browser storage, attached resumes must be 1 MB or smaller. Use a resume link for larger files.', 'error');
                event.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                state.profile.resumeName = file.name;
                state.profile.resumeDataUrl = String(reader.result);
                $('profResumeUrl').value = '';
                updateProfileCompleteness();
                showToast(`${file.name} attached. Save your profile to keep it.`, 'success');
            };
            reader.onerror = () => showToast('Could not read that file. Please try again.', 'error');
            reader.readAsDataURL(file);
        });
        $('confirmApplyBtn').addEventListener('click', () => {
            const drive = getDrive(activeDriveId);
            if (!drive || !eligibility(drive).eligible || state.applications.some((item) => item.driveId === drive.id)) return;
            const application = {
                id: `APP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                driveId: drive.id, driveSnapshot: { ...drive }, profileSnapshot: JSON.parse(JSON.stringify(state.profile)),
                appliedAt: new Date().toISOString(), status: 'Applied', coverNote: $('applyCoverNote').value.trim()
            };
            state.applications.push(application);
            saveState();
            closeModal('applyModal');
            renderEverything();
            showToast(`Application submitted to ${drive.company}.`, 'success');
        });
        $('detailModalApplyBtn').addEventListener('click', () => {
            const drive = getDrive(activeDriveId);
            if (!drive) return;
            closeModal('driveDetailModal');
            fillApplyModal(drive);
        });
        $('applicationsContainer').addEventListener('click', (event) => {
            const button = event.target.closest('[data-action="slip"]');
            if (button) {
                const application = state.applications.find((item) => item.id === button.dataset.id);
                if (application) showApplicationSlip(application);
            }
        });
        $('adminApplicantsContainer').addEventListener('change', (event) => {
            const select = event.target.closest('[data-action="status"]');
            if (!select) return;
            const application = state.applications.find((item) => item.id === select.dataset.id);
            if (!application || !statuses.includes(select.value)) return;
            application.status = select.value;
            saveState();
            renderEverything();
            showToast(`Application status updated to ${application.status}.`, 'success');
        });
        document.querySelectorAll('[data-dismiss="modal"]').forEach((button) => button.addEventListener('click', () => closeModal(button.closest('.modal-overlay'))));
        document.querySelectorAll('.modal-overlay').forEach((modal) => modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(modal); }));
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(closeModal);
        });
    }

    async function init() {
        let sessionEmail = null;
        try {
            sessionEmail = sessionStorage.getItem(SESSION_KEY);
        } catch (error) {
            document.body.classList.remove('is-authenticated');
            document.body.classList.remove('profile-incomplete');
        }
        try {
            await loadDatabaseState();
        } catch (error) {
            databaseAvailable = false;
            console.warn('CampusHire database is unavailable; using browser storage:', error);
        }
        bindEvents();
        populateProfile();
        renderEverything();
        if (sessionEmail) enterAccount(sessionEmail);
        else {
            document.body.classList.remove('is-authenticated');
            document.body.classList.remove('profile-incomplete');
        }
        if (!databaseAvailable) showToast('Database is unavailable. Start the local server to enable SQLite persistence.', 'error');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
