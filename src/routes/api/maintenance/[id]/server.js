// src/routes/api/maintenance/[id]/+server.js

import { json } from '@sveltejs/kit';
import { maintenanceService } from '$lib/services/maintenance.js';
import { projectToolsService } from '$lib/services/projectTools.js';

export async function GET({ params }) {
    try {
        console.log('API: Getting maintenance ID:', params.id);
        const maintenanceData = await maintenanceService.getById(params.id);
        console.log('API: Retrieved maintenance data:', maintenanceData);
        return json(maintenanceData);
    } catch (error) {
        console.error('API: Error fetching maintenance:', error);
        return json({ error: 'Maintenance not found' }, { status: 404 });
    }
}

export async function PATCH({ params, request }) {
    try {
        console.log('API: Updating maintenance ID:', params.id);
        const data = await request.json();
        console.log('API: Update data received:', data);
        
        // Get current maintenance data first
        const currentMaintenance = await maintenanceService.getById(params.id);
        
        // Update the maintenance record
        const updatedMaintenance = await maintenanceService.update(params.id, data);
        console.log('API: Update successful:', updatedMaintenance);
          // If maintenance status is set to 'completed', update tool condition from 'bermasalah' to 'normal'
        if (data.status === 'completed' && currentMaintenance?.tool_id?.id && currentMaintenance?.project_id?.id) {
            try {
                // Find the project_tools record for this tool and project
                const projectToolsResponse = await projectToolsService.getAll({
                    filter: {
                        _and: [
                            { tool_id: { _eq: currentMaintenance.tool_id.id } },
                            { project_id: { _eq: currentMaintenance.project_id.id } }
                        ]
                    }
                });
                
                if (projectToolsResponse?.data?.length > 0) {
                    const projectTool = projectToolsResponse.data[0];
                    
                    // Only update if current condition is 'bermasalah'
                    if (projectTool.condition === 'bermasalah') {
                        await projectToolsService.updateCondition(projectTool.id, {
                            condition: 'normal'
                        });
                        console.log('API: Updated tool condition from bermasalah to normal');
                    }
                }
            } catch (toolUpdateError) {
                console.error('API: Error updating tool condition:', toolUpdateError);
                // Don't fail the maintenance update if tool condition update fails
            }
        }
        
        return json(updatedMaintenance);
    } catch (error) {
        console.error('API: Error updating maintenance:', error);
        return json({ error: 'Failed to update maintenance' }, { status: 500 });
    }
}