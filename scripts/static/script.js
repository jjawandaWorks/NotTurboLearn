document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const recordBtn = document.getElementById('recordBtn');
    const recordBtnText = document.getElementById('recordBtnText');
    const uploadInput = document.getElementById('uploadInput');
    const loader = document.getElementById('loader');
    const loaderText = document.getElementById('loader-text');
    const loaderStatus = document.getElementById('loader-status');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const historyList = document.getElementById('history-list');
    const notesOutput = document.getElementById('notes-output');
    const transcriptionOutput = document.getElementById('transcription-output');
    const chatMessages = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatSubmitBtn = document.getElementById('chat-submit-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const sidebar = document.querySelector('.sidebar');
    const addFolderBtn = document.getElementById('add-folder-btn');
    const visualizer = document.getElementById('visualizer');
    const likedList = document.getElementById('liked-list');
    
    // Like Button Elements
    const likeBtn = document.getElementById('likeBtn');
    const likeBtnText = document.getElementById('likeBtnText');
    
    // Move Modal Elements
    const moveModal = document.getElementById('move-modal');
    const folderSelect = document.getElementById('folder-select');
    const cancelMoveBtn = document.getElementById('cancel-move-btn');
    const confirmMoveBtn = document.getElementById('confirm-move-btn');

    // Status Modal Elements
    const statusBtn = document.getElementById('statusBtn');
    const statusModal = document.getElementById('status-modal');
    const statusModalContent = document.getElementById('status-modal-content');
    const closeStatusBtn = document.getElementById('close-status-btn');

    // --- State Management ---
    let isRecording = false;
    let mediaRecorder;
    let audioChunks = [];
    let currentTranscriptId = null;
    let transcriptToMove = null;
    let pollingInterval = null;
    let audioContext, analyser, dataArray, source, animationFrameId;
    let isCurrentLiked = false;

    // --- Core Functions ---
    const loadHistory = async () => {
        try {
            const response = await fetch('/history');
            if (!response.ok) throw new Error('Failed to fetch history.');
            const data = await response.json();

            historyList.innerHTML = '';
            if (data.folders.length === 0 && data.unfiled.length === 0) {
                historyList.innerHTML = '<p class="placeholder">No sessions yet.</p>';
                return;
            }

            data.folders.forEach(folder => {
                const folderDiv = createFolderElement(folder, data.folders);
                historyList.appendChild(folderDiv);
            });
            
            if (data.unfiled.length > 0) {
                const unfiledContainer = document.createElement('div');
                unfiledContainer.className = 'folder-item';
                
                const unfiledHeader = document.createElement('div');
                unfiledHeader.className = 'folder-header';
                unfiledHeader.textContent = 'Unorganized';
                unfiledHeader.addEventListener('click', () => unfiledContainer.classList.toggle('open'));
                unfiledContainer.appendChild(unfiledHeader);

                const unfiledContents = document.createElement('div');
                unfiledContents.className = 'folder-contents';
                data.unfiled.forEach(item => {
                    unfiledContents.appendChild(createTranscriptElement(item, data.folders));
                });
                unfiledContainer.appendChild(unfiledContents);
                historyList.appendChild(unfiledContainer);
            }

        } catch (error) {
            console.error('Failed to load history:', error);
            historyList.innerHTML = `<p class="placeholder">Could not load history.</p>`;
        }
    };

    const createFolderElement = (folder, allFolders) => {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder-item';

        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';
        
        const folderNameSpan = document.createElement('span');
        folderNameSpan.textContent = folder.name;
        folderHeader.appendChild(folderNameSpan);

        if (folder.name !== 'Unorganized') {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-folder-btn';
            deleteBtn.title = 'Delete Folder';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteFolder(folder.id, folder.name);
            });
            folderHeader.appendChild(deleteBtn);
        }
        
        folderHeader.addEventListener('click', () => folderDiv.classList.toggle('open'));
        folderDiv.appendChild(folderHeader);

        const folderContents = document.createElement('div');
        folderContents.className = 'folder-contents';
        folder.transcripts.forEach(item => {
            folderContents.appendChild(createTranscriptElement(item, allFolders));
        });
        folderDiv.appendChild(folderContents);
        return folderDiv;
    };
    
    const createTranscriptElement = (item, allFolders) => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.dataset.id = item.id;
        
        const fileName = item.filename || 'Recording';
        const date = new Date(item.created_at).toLocaleString();

        div.innerHTML = `
            <div class="history-item-info">
                <p class="filename">${fileName}</p>
                <p class="date">${date}</p>
            </div>
            <div class="history-item-actions">
                <button class="move-btn" title="Move Session">➡️</button>
                <button class="edit-btn" title="Edit Name">✏️</button>
                <button class="delete-btn" title="Delete Session">🗑️</button>
            </div>
        `;
        div.querySelector('.history-item-info').addEventListener('click', () => loadSession(item.id));
        div.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            editSessionName(item.id, fileName);
        });
        div.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteSession(item.id);
        });
        div.querySelector('.move-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            openMoveModal(item.id, allFolders);
        });
        return div;
    };

    const loadSession = async (transcriptId) => {
        showLoader(true, 'Loading session...');
        try {
            const response = await fetch(`/session/${transcriptId}`);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            
            currentTranscriptId = transcriptId;
            renderNotes(data.notes_markdown);
            renderTranscription(data.transcript_text);
            renderChatHistory(data.chat_history);
            enableChat(true);
            
            // Check liked state for this session
            await checkLikedState(transcriptId);
            
            document.querySelectorAll('.history-item').forEach(item => {
                item.classList.toggle('active', item.dataset.id == transcriptId);
            });
        } catch (error) {
            alert(`Failed to load session: ${error.message}`);
        } finally {
            showLoader(false);
        }
    };
    
    // --- Liked Songs/Sessions API Functions ---
    const checkLikedState = async (songId) => {
        try {
            const response = await fetch(`/api/songs/${songId}/liked`);
            if (!response.ok) throw new Error('Failed to check liked state');
            const data = await response.json();
            
            isCurrentLiked = data.liked;
            updateLikeButtonUI();
            likeBtn.classList.remove('hidden');
        } catch (error) {
            console.error('Error checking liked state:', error);
            likeBtn.classList.add('hidden');
        }
    };
    
    const toggleLike = async () => {
        if (!currentTranscriptId) return;
        
        const method = isCurrentLiked ? 'DELETE' : 'POST';
        try {
            const response = await fetch(`/api/songs/${currentTranscriptId}/like`, {
                method: method
            });
            if (!response.ok) throw new Error('Failed to update like state');
            const data = await response.json();
            
            isCurrentLiked = data.liked;
            updateLikeButtonUI();
            
            // Refresh liked songs list if it's visible
            const likedTab = document.getElementById('liked');
            if (likedTab && likedTab.classList.contains('active')) {
                await loadLikedSongs();
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    };
    
    const updateLikeButtonUI = () => {
        if (isCurrentLiked) {
            likeBtn.classList.add('liked');
            likeBtnText.textContent = 'Liked';
        } else {
            likeBtn.classList.remove('liked');
            likeBtnText.textContent = 'Like';
        }
    };
    
    const loadLikedSongs = async () => {
        try {
            const response = await fetch('/api/liked-songs');
            if (!response.ok) throw new Error('Failed to load liked songs');
            const data = await response.json();
            
            renderLikedSongs(data.liked_songs);
        } catch (error) {
            console.error('Error loading liked songs:', error);
            likedList.innerHTML = '<div class="placeholder-content"><p>Failed to load liked sessions.</p></div>';
        }
    };
    
    const renderLikedSongs = (songs) => {
        if (!songs || songs.length === 0) {
            likedList.innerHTML = `
                <div class="placeholder-content">
                    <h3>No Liked Sessions</h3>
                    <p>Sessions you like will appear here. Click the heart icon on any session to add it to your favorites.</p>
                </div>
            `;
            return;
        }
        
        likedList.innerHTML = songs.map(song => `
            <div class="liked-song-item" data-id="${song.id}">
                <div class="liked-song-info">
                    <div class="song-title">${song.filename || 'Recording'}</div>
                    <div class="song-date">Liked: ${new Date(song.liked_at).toLocaleDateString()}</div>
                </div>
                <div class="liked-song-actions">
                    <button class="unlike-btn" data-id="${song.id}" title="Remove from liked">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        likedList.querySelectorAll('.liked-song-item').forEach(item => {
            const songInfo = item.querySelector('.liked-song-info');
            if (songInfo) {
                songInfo.addEventListener('click', () => {
                    loadSession(parseInt(item.dataset.id));
                });
            }
        });
        
        likedList.querySelectorAll('.unlike-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const songId = parseInt(btn.dataset.id);
                try {
                    const response = await fetch(`/api/songs/${songId}/like`, {
                        method: 'DELETE'
                    });
                    if (!response.ok) throw new Error('Failed to unlike');
                    
                    // Update UI if current session is the one being unliked
                    if (currentTranscriptId === songId) {
                        isCurrentLiked = false;
                        updateLikeButtonUI();
                    }
                    
                    // Reload the liked songs list
                    await loadLikedSongs();
                } catch (error) {
                    console.error('Error unliking song:', error);
                }
            });
        });
    };
    
    const sendAudioForTranscription = (audioData, fileName) => {
        const formData = new FormData();
        formData.append('audio', audioData, fileName);

        showLoader(true, 'Uploading...');
        loaderStatus.textContent = '';
        progressContainer.classList.remove('hidden');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/transcribe', true);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                progressBar.style.width = percentComplete + '%';
                if (percentComplete === 100) {
                    loaderText.textContent = 'Queued...';
                    loaderStatus.textContent = 'Your file is in line for transcription.';
                }
            }
        };

        xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                startPolling(data.job_id);
            } else {
                let errorMessage = `HTTP error! Status: ${xhr.status}`;
                try {
                    const errData = JSON.parse(xhr.responseText);
                    errorMessage = errData.error || errorMessage;
                } catch (e) {}
                renderNotes(`<h2>Upload Failed</h2><p>${errorMessage}</p>`);
                showLoader(false);
            }
        };
        
        xhr.onerror = () => {
            renderNotes(`<h2>Upload Failed</h2><p>Could not connect to the server.</p>`);
            showLoader(false);
        };

        xhr.send(formData);
    };

    const startPolling = (jobId) => {
        stopPolling(); 

        pollingInterval = setInterval(async () => {
            try {
                const response = await fetch(`/status/${jobId}`);
                if (!response.ok) return;

                const data = await response.json();
                
                if (data.status === 'processing') {
                    showLoader(true, 'Transcribing...', 'This may take a few moments.');
                } else if (data.status === 'completed') {
                    stopPolling();
                    await loadHistory();
                    if(data.transcript_id) {
                        await loadSession(data.transcript_id);
                    } else {
                        showLoader(false);
                    }
                } else if (data.status === 'failed') {
                    stopPolling();
                    renderNotes(`<h2>Transcription Failed</h2><p>${data.error_message || 'An unknown error occurred.'}</p>`);
                    showLoader(false);
                } else if (data.status === 'queued') {
                    showLoader(true, 'In Queue...', 'Waiting for another job to finish.');
                }

            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 3000);
    };

    const stopPolling = () => {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    };


    const openMoveModal = (transcriptId, folders) => {
        transcriptToMove = transcriptId;
        folderSelect.innerHTML = '';

        const unorganizedFolder = folders.find(f => f.name === 'Unorganized');
        if (unorganizedFolder) {
            const option = document.createElement('option');
            option.value = unorganizedFolder.id;
            option.textContent = unorganizedFolder.name;
            folderSelect.appendChild(option);
        }

        folders.forEach(folder => {
            if (folder.name !== 'Unorganized') {
                const option = document.createElement('option');
                option.value = folder.id;
                option.textContent = folder.name;
                folderSelect.appendChild(option);
            }
        });

        moveModal.classList.remove('hidden');
    };

    const closeMoveModal = () => {
        transcriptToMove = null;
        moveModal.classList.add('hidden');
    };

    const moveSession = async () => {
        if (!transcriptToMove) return;

        const folderId = folderSelect.value;
        try {
            const response = await fetch(`/transcripts/${transcriptToMove}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_id: folderId })
            });
            if (!response.ok) throw new Error('Failed to move session.');
            await loadHistory();
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            closeMoveModal();
        }
    };

    const editSessionName = async (transcriptId, currentName) => {
        const newName = prompt("Enter a new name for this session:", currentName);
        if (newName && newName.trim() !== "" && newName.trim() !== currentName) {
            try {
                const response = await fetch(`/edit/${transcriptId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName.trim() })
                });
                if (!response.ok) throw new Error('Failed to save new name.');
                await loadHistory();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    };

    const deleteSession = async (transcriptId) => {
        if (confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
            try {
                const response = await fetch(`/delete/${transcriptId}`, { method: 'POST' });
                if (!response.ok) throw new Error('Failed to delete session.');
                
                if (currentTranscriptId == transcriptId) {
                    renderNotes('<div class="placeholder-content"><h3>Session Deleted</h3><p>Please select another session or start a new one.</p></div>');
                    renderTranscription('');
                    renderChatHistory([]);
                    enableChat(false);
                    currentTranscriptId = null;
                }
                await loadHistory();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    };
    
    const deleteFolder = async (folderId, folderName) => {
        if (confirm(`Are you sure you want to delete the folder "${folderName}"? All sessions inside will be moved to Unorganized.`)) {
            try {
                const response = await fetch(`/folders/${folderId}`, { method: 'DELETE' });
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Failed to delete folder.');
                }
                await loadHistory();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    };
    
    // --- UI Update Functions ---
    const showLoader = (isLoading, text = 'Processing...', status = '') => {
        loaderText.textContent = text;
        loaderStatus.textContent = status;
        loader.classList.toggle('hidden', !isLoading);
        if (!isLoading) {
            progressContainer.classList.add('hidden');
            progressBar.style.width = '0%';
        }
    };
    
    const renderNotes = (markdown) => {
        notesOutput.innerHTML = markdown ? marked.parse(markdown) : '<div class="placeholder-content"><h3>Error</h3><p>Received empty notes from the server.</p></div>';
    };

    const renderTranscription = (text) => {
        if (!text || text.trim() === '') {
            transcriptionOutput.innerHTML = '<div class="placeholder-content"><h3>Transcription is empty.</h3></div>';
            return;
        }
        transcriptionOutput.innerHTML = marked.parse(text);
    };

    const renderChatHistory = (history) => {
        chatMessages.innerHTML = '';
        if (history && history.length > 0) {
            history.forEach(chat => addChatMessage(chat.message, chat.sender));
        } else {
            addChatMessage("Hello! Ask me anything about the loaded lecture notes.", 'ai');
        }
    };
    
    const addChatMessage = (message, sender) => {
        const messageEl = document.createElement('div');
        messageEl.className = `chat-bubble ${sender}-bubble`;
        messageEl.innerHTML = marked.parse(message);
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const enableChat = (enabled = true) => {
        chatInput.disabled = !enabled;
        chatSubmitBtn.disabled = !enabled;
        chatInput.placeholder = enabled ? "Ask a question about the notes..." : "Upload or record audio to begin chat.";
    };
    
    const updateRecordingUI = () => {
        recordBtnText.textContent = isRecording ? 'Stop' : 'Record';
        recordBtn.classList.toggle('recording', isRecording);
    };
    
    const startVisualizer = (stream) => {
        visualizer.classList.remove('hidden');
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
    
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
    
        const canvasCtx = visualizer.getContext('2d');
        const WIDTH = visualizer.width;
        const HEIGHT = visualizer.height;
    
        const draw = () => {
            if (!isRecording) return;
            animationFrameId = requestAnimationFrame(draw);
    
            analyser.getByteFrequencyData(dataArray);
    
            canvasCtx.fillStyle = '#111111';
            canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    
            const barWidth = (WIDTH / bufferLength) * 2.5;
            let barHeight;
            let x = 0;
    
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                
                canvasCtx.fillStyle = 'rgb(0, 122, 255)';
                canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight);
    
                x += barWidth + 1;
            }
        };
        draw();
    };
    
    const stopVisualizer = () => {
        visualizer.classList.add('hidden');
        cancelAnimationFrame(animationFrameId);
        if (audioContext) {
            audioContext.close();
        }
    };

    // --- Event Handlers ---
    uploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            sendAudioForTranscription(file, file.name);
        }
        event.target.value = null;
    });

    recordBtn.addEventListener('click', async () => {
        if (isRecording) {
            mediaRecorder.stop();
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                isRecording = true;
                startVisualizer(stream);
                audioChunks = [];
                const supportedTypes = ['audio/mp4', 'audio/webm', 'audio/ogg'];
                const mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
                const fileExtension = mimeType.includes('mp4') ? 'mp4' : 'webm';
                mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });
                
                mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
                
                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: mimeType });
                    const safeTimestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
                    const fileName = `recording_${safeTimestamp}.${fileExtension}`;
                    sendAudioForTranscription(audioBlob, fileName);
                    stream.getTracks().forEach(track => track.stop());
                    isRecording = false;
                    stopVisualizer(); // MODIFIED: Moved this line
                    updateRecordingUI(); // MODIFIED: Moved this line
                };
                
                mediaRecorder.start();
                updateRecordingUI();
            } catch (err) {
                console.error("Error accessing microphone:", err.name, err.message);
                if (err.name === 'NotAllowedError') {
                    alert("Microphone access was denied. Please check browser permissions by clicking the lock icon in the address bar.");
                } else if (err.name === 'NotFoundError') {
                    alert("No microphone was found. Please ensure your microphone is connected and enabled.");
                } else {
                    alert(`Could not access microphone. Error: ${err.name}. Please ensure you are using HTTPS and have granted permissions.`);
                }
            }
        }
    });

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        addChatMessage(userMessage, 'user');
        chatInput.value = '';
        chatInput.disabled = true;
        chatSubmitBtn.disabled = true;

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to get response.');
            addChatMessage(data.response, 'ai');
        } catch (error) {
            addChatMessage(`Error: ${error.message}`, 'ai');
        } finally {
            chatInput.disabled = false;
            chatSubmitBtn.disabled = false;
            chatInput.focus();
        }
    });

    addFolderBtn.addEventListener('click', async () => {
        const folderName = prompt("Enter a new folder name:");
        if (folderName && folderName.trim() !== "") {
            try {
                const response = await fetch('/folders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: folderName.trim() })
                });
                if (!response.ok) throw new Error('Failed to create folder.');
                await loadHistory();
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    });

    // Like button event listener
    if (likeBtn) {
        likeBtn.addEventListener('click', toggleLike);
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            
            // Load liked songs when switching to liked tab
            if (btn.dataset.tab === 'liked') {
                await loadLikedSongs();
            }
        });
    });

    // --- Modal Event Handlers ---
    confirmMoveBtn.addEventListener('click', moveSession);
    cancelMoveBtn.addEventListener('click', closeMoveModal);
    moveModal.addEventListener('click', (e) => {
        if (e.target === moveModal) closeMoveModal();
    });

    statusBtn.addEventListener('click', async () => {
        statusModal.classList.remove('hidden');
        statusModalContent.innerHTML = '<p>Loading status...</p>';
        try {
            const response = await fetch('/queue_status');
            const data = await response.json();
            
            let content = '';
            if (data.processing_file) {
                content += `<p><strong>Currently Processing:</strong><br>${data.processing_file}</p>`;
            } else {
                content += '<p>No file is currently being processed.</p>';
            }
            content += `<p style="margin-top: 1rem;"><strong>Files in Queue:</strong> ${data.queued_count}</p>`;
            
            statusModalContent.innerHTML = content;
        } catch (error) {
            statusModalContent.innerHTML = '<p>Could not load queue status.</p>';
        }
    });

    const closeStatusModal = () => statusModal.classList.add('hidden');
    closeStatusBtn.addEventListener('click', closeStatusModal);
    statusModal.addEventListener('click', (e) => {
        if (e.target === statusModal) closeStatusModal();
    });

    // --- Sidebar Toggle for Mobile ---
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebarBackdrop = document.createElement('div');
    sidebarBackdrop.className = 'sidebar-backdrop';

    if (sidebarToggle) {
        document.body.appendChild(sidebarBackdrop);

        const toggleSidebar = (forceClose = false) => {
            const isActive = sidebar.classList.contains('active');
            const shouldBeActive = !isActive && !forceClose;
            sidebar.classList.toggle('active', shouldBeActive);
            sidebarBackdrop.classList.toggle('active', shouldBeActive);
            document.body.style.overflow = shouldBeActive ? 'hidden' : '';
        };

        sidebarToggle.addEventListener('click', () => toggleSidebar());
        sidebarBackdrop.addEventListener('click', () => toggleSidebar(true));
        
        historyList.addEventListener('click', (e) => {
             if (e.target.closest('.history-item-info')) {
                 setTimeout(() => toggleSidebar(true), 150);
             }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sidebar.classList.contains('active')) {
                toggleSidebar(true);
            }
        });
    }

    // --- Initial Load ---
    loadHistory();
});