# **App Name**: SolarLeads

## Core Features:

- Role-Based Authentication: Implement a secure email/password login system using Firebase Authentication to manage user access and roles (Admin, Sales Rep, Viewer).
- Lead Capture Form: Capture customer details including name, mobile number, address, location (using browser GPS), KW requirement, visit dates, lead owner, lead source, and status.
- Lead Dashboard: Display key metrics like Total Leads and Leads by Status using chart visualizations, also filtering functionality to slice the datatable with key lead properties
- User-Specific Views: Display only the relevant data for the current logged-in user to the Sales Reps and Viewer roles. Show admin users all lead entries.

## Style Guidelines:

- Primary color: Deep sky blue (#3498db) to convey trust and reliability in solar solutions.
- Background color: Light gray (#ecf0f1) to provide a clean, neutral backdrop for content.
- Accent color: Orange (#e67e22) to highlight key actions and data points, drawing attention to important elements.
- Font pairing: 'Poppins' (sans-serif) for headings and 'PT Sans' (sans-serif) for body text.
- Use clear, modern icons to represent lead status, data categories, and user actions, aiding quick recognition and navigation.
- Design a responsive layout using TailwindCSS grid and flexbox, ensuring the dashboard adapts smoothly to different screen sizes.
- Incorporate subtle transitions and animations to provide feedback on user interactions, making the interface feel more interactive and responsive.