export const embeddingTargets = [
    {
        id: 'nocodb-products',
        type: 'api',
        title: 'ฐานข้อมูลสินค้า',
        description: 'Embedded view of the master product catalog directly from NocoDB.',
        placeholderUrl: 'https://db.learningforkidz.com/dashboard/#/nc/view/05a4b0be-476f-414d-99eb-eca9565ce036',
        status: 'ready',
        viewId: '05a4b0be-476f-414d-99eb-eca9565ce036',
        projectSlug: 'pmrh4kweqadj3e0',
        tableSlug: 'mi1wguypfkab12u',
        defaultLimit: 50,
        integrationNotes: 'This view streams from the shared NocoDB dashboard. Manage permissions from NocoDB and rotate share links if exposure needs to be revoked.',
        manageUrl: 'https://db.learningforkidz.com/dashboard/#/nc/view/05a4b0be-476f-414d-99eb-eca9565ce036'
    },
    {
        id: 'nocodb-customer-types',
        type: 'api',
        title: 'ประเภทลูกค้า',
        description: 'Customer segmentation reference managed inside the Learning for Kidz NocoDB space.',
        placeholderUrl: 'https://db.learningforkidz.com/dashboard/#/nc/view/5791e350-c1bb-4f03-82f9-96ad8d952677',
        status: 'ready',
        viewId: '5791e350-c1bb-4f03-82f9-96ad8d952677',
        projectSlug: 'pmrh4kweqadj3e0',
        tableSlug: 'myud6cs8uhz9vl1',
        defaultLimit: 50,
        integrationNotes: 'Ensure the shared view stays read-only for analysts who only need visibility into customer classifications.',
        manageUrl: 'https://db.learningforkidz.com/dashboard/#/nc/view/5791e350-c1bb-4f03-82f9-96ad8d952677'
    },
    {
        id: 'nocodb-condition-sku',
        type: 'api',
        title: 'Condition SKU',
        description: 'Conditions-to-SKU mapping grid served straight from the hosted NocoDB instance.',
        placeholderUrl: 'https://db.learningforkidz.com/dashboard/#/nc/view/9d0056ab-1f86-4e06-a3d0-bbcb4564712d',
        status: 'ready',
        viewId: '9d0056ab-1f86-4e06-a3d0-bbcb4564712d',
        projectSlug: 'pmrh4kweqadj3e0',
        tableSlug: 'mnrsvmnrbcqqeng',
        defaultLimit: 50,
        integrationNotes: 'Keep this embed scoped to sanitized data; use NocoDB filters/roles if sensitive columns are added later.',
        manageUrl: 'https://db.learningforkidz.com/dashboard/#/nc/view/9d0056ab-1f86-4e06-a3d0-bbcb4564712d'
    },
    {
        id: 'nocodb-sales-target',
        type: 'api',
        title: 'เป้ายอดขาย',
        description: 'Sales target worksheet mirrored from NocoDB for quick review inside the dashboard.',
        placeholderUrl: 'https://db.learningforkidz.com/dashboard/#/nc/view/fd21fc3a-555e-4ed9-b0cb-7276f7bf7606',
        status: 'ready',
        viewId: 'fd21fc3a-555e-4ed9-b0cb-7276f7bf7606',
        projectSlug: 'pmrh4kweqadj3e0',
        tableSlug: 'm2ej2yiy750wwfh',
        defaultLimit: 50,
        integrationNotes: 'Adjust the share link each quarter if the quota sheet moves; iframe will auto-refresh with the updated URL.',
        manageUrl: 'https://db.learningforkidz.com/dashboard/#/nc/view/fd21fc3a-555e-4ed9-b0cb-7276f7bf7606'
    }
];
