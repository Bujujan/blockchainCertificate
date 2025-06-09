let web3;
let certificateContract;
let userManagementContract;

async function init() {
    if (!localStorage.getItem('userRole') || localStorage.getItem('userRole') !== '1') {
        window.location.href = '/login.html';
        return;
    }

    if (typeof window.ethereum === 'undefined') {
        document.getElementById('message').textContent = 'Please install MetaMask';
        return;
    }

    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        web3 = new Web3(window.ethereum);

        const response = await fetch('/contract-config.json');
        const config = await response.json();

        certificateContract = new web3.eth.Contract(config.certificateABI, config.certificateAddress);
        userManagementContract = new web3.eth.Contract(config.userManagementABI, config.userManagementAddress);

        await loadStudents();

        document.getElementById('studentSelect').addEventListener('change', onStudentSelected);
        document.getElementById('issueCertificateForm').addEventListener('submit', issueCertificate);

    } catch (error) {
        console.error('Error initializing Web3:', error);
        document.getElementById('message').textContent = 'Error connecting to blockchain';
    }
}

async function loadStudents() {
    try {
        // Assuming userManagementContract has a method to list students (e.g., getUsersByRole)
        // Role '0' = student (you can adapt to your contract)
        const students = await userManagementContract.methods.getUsersByRole(0).call();

        const select = document.getElementById('studentSelect');
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.address; 
            option.textContent = student.name || student.address;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading students:', error);
        document.getElementById('message').textContent = 'Error loading students list.';
    }
}

async function onStudentSelected(event) {
    const studentAddress = event.target.value;
    const selectedStudentName = event.target.options[event.target.selectedIndex].text;
    document.getElementById('selectedStudentName').textContent = selectedStudentName || '[Unknown]';

    if (studentAddress) {
        await loadCertificates(studentAddress);
    } else {
        clearCertificatesTable();
    }
}

async function loadCertificates(studentAddress) {
    try {
        const certificates = await certificateContract.methods.getCertificatesByStudent(studentAddress).call();

        // Sort by issueDate descending (newest first)
        certificates.sort((a, b) => b.issueDate - a.issueDate);

        const tbody = document.querySelector('#certificatesTable tbody');
        tbody.innerHTML = '';

        certificates.forEach(cert => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cert.courseName}</td>
                <td>${new Date(cert.issueDate * 1000).toLocaleDateString()}</td>
                <td><a href="https://ipfs.io/ipfs/${cert.ipfsHash}" target="_blank" class="btn">View</a></td>
            `;
            tbody.appendChild(tr);
        });

        if (certificates.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="3">No certificates found for this student.</td>`;
            tbody.appendChild(tr);
        }
    } catch (error) {
        console.error('Error loading certificates:', error);
        document.getElementById('message').textContent = 'Error loading certificates.';
    }
}

function clearCertificatesTable() {
    const tbody = document.querySelector('#certificatesTable tbody');
    tbody.innerHTML = '';
}

async function issueCertificate(event) {
    event.preventDefault();

    const studentAddress = document.getElementById('studentSelect').value;
    if (!studentAddress) {
        document.getElementById('message').textContent = 'Please select a student first.';
        document.getElementById('message').className = 'message error';
        return;
    }

    const courseName = document.getElementById('courseName').value;
    const certificateFile = document.getElementById('certificateFile').files[0];

    if (!certificateFile) {
        document.getElementById('message').textContent = 'Please select a certificate file.';
        document.getElementById('m
