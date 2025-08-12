// JavaScript for Family Tree Creator
// This is the main JavaScript file for the Family Tree Creator.
// It handles all the logic for adding, deleting, and visualizing the family tree.

document.addEventListener('DOMContentLoaded', () => {
    // A simple custom modal to display messages to the user.
    const messageModal = document.getElementById('message-modal');
    const modalMessage = document.getElementById('modal-message');
    const closeButton = document.querySelector('.close-button');

    function showMessage(message) {
        modalMessage.textContent = message;
        messageModal.style.display = 'block';
    }

    closeButton.addEventListener('click', () => {
        messageModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == messageModal) {
            messageModal.style.display = 'none';
        }
    });

    // An empty array to store the family members.
    let familyMembers = [];
    const addMemberForm = document.getElementById('add-member-form');
    const memberNameInput = document.getElementById('member-name');
    const relatedToSelect = document.getElementById('related-to');
    const relationshipSelect = document.getElementById('relationship');
    const familyTreeContainer = document.getElementById('family-tree-container');
    const downloadImgBtnNav = document.getElementById('download-img-btn-nav');
    const downloadImgBtnPage = document.getElementById('download-img-btn-page');

    // Function to update the related-to dropdown with existing members.
    function updateRelatedToDropdown() {
        // Clear existing options
        relatedToSelect.innerHTML = '';
        // Add a default option for the root member
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'None (for the first member)';
        relatedToSelect.appendChild(defaultOption);

        // Add each family member to the dropdown
        familyMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = member.name;
            relatedToSelect.appendChild(option);
        });
    }

    // Function to draw the family tree using D3.js.
    function drawTree() {
        // Clear the existing SVG
        familyTreeContainer.innerHTML = '';
        const data = d3.stratify()
            .id(d => d.id)
            .parentId(d => d.parentId)(familyMembers);

        // If no data, display a message and return.
        if (!data.children && !data.data) {
            familyTreeContainer.innerHTML = '<p class="familytree-instructions">Start by adding the first family member to create the tree!</p>';
            return;
        }

        const treeLayout = d3.tree().size([800, 500]);
        const root = d3.hierarchy(data);
        treeLayout(root);

        const svg = d3.select(familyTreeContainer)
            .append('svg')
            .attr('width', 900)
            .attr('height', 600)
            .append('g')
            .attr('transform', 'translate(50, 50)');

        // Draw links
        const links = svg.selectAll('.link')
            .data(root.links())
            .enter()
            .append('path')
            .attr('class', 'link')
            .attr('d', d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y));

        // Draw nodes
        const nodes = svg.selectAll('.node')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x}, ${d.y})`);

        // Add circles to nodes
        nodes.append('circle')
            .attr('r', 20)
            .attr('fill', '#3f0')
            .attr('stroke', '#000')
            .attr('stroke-width', 2);
        
        // Add text labels to nodes
        nodes.append('text')
            .attr('dy', -25) // Position the text above the circle
            .attr('text-anchor', 'middle')
            .text(d => d.data.data.name);

    }

    // Event listener for the form submission
    addMemberForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const memberName = memberNameInput.value.trim();
        const relatedTo = relatedToSelect.value;
        const relationship = relationshipSelect.value;

        // Validation for the first member (must have no parent)
        if (familyMembers.length === 0 && relatedTo) {
            showMessage("The first member of the tree must not be related to anyone. Please select 'None' for the 'Related to' field.");
            return;
        }
        
        const newMember = {
            id: familyMembers.length + 1, // Simple ID for now
            name: memberName,
            parentId: relationship === 'child' ? relatedTo : null, // Parent is the relatedTo member
            children: []
        };
        
        // If the new member is a child, find the parent and add the new member to their children list
        if (relationship === 'child') {
            const parent = familyMembers.find(m => m.id == relatedTo);
            if (parent) {
                newMember.parentId = parent.id;
            }
        }
        
        // If the new member is a parent, find the child and add the new member as their parent
        if (relationship === 'parent') {
            const child = familyMembers.find(m => m.id == relatedTo);
            if (child) {
                newMember.children.push(child);
                child.parentId = newMember.id;
            }
        }

        // If the new member is a sibling, find the parent of the related member and add the new member as a child
        if (relationship === 'sibling') {
            const sibling = familyMembers.find(m => m.id == relatedTo);
            if (sibling && sibling.parentId) {
                newMember.parentId = sibling.parentId;
            } else {
                showMessage("A sibling must be related to someone who has a parent. Please add a parent first.");
                return;
            }
        }

        familyMembers.push(newMember);

        // Update the form and redraw the tree
        updateRelatedToDropdown();
        drawTree();
        addMemberForm.reset();
    });

    // Function to handle image download
    function downloadImage(downloadButton) {
        // Use html2canvas to capture the family tree container as an image
        const treeContainer = document.getElementById('family-tree-container');
        if (!treeContainer || !treeContainer.querySelector('svg')) {
            showMessage("There is no family tree to download yet. Please add some members first.");
            return;
        }
        
        html2canvas(treeContainer).then(canvas => {
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'family-tree.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(error => {
            console.error("Error during image download:", error);
            showMessage("An error occurred while trying to download the image.");
        });
    }

    // Event listeners for the download buttons
    downloadImgBtnNav.addEventListener('click', () => downloadImage(downloadImgBtnNav));
    downloadImgBtnPage.addEventListener('click', () => downloadImage(downloadImgBtnPage));
    
    // Initial call to set up the dropdown and the tree space
    updateRelatedToDropdown();
    drawTree();
});

