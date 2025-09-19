// mockData.js - Mock data for products
export const mockProductData = {
  // Mock ratings data
  ratings: {
    average: 4.2,
    total: 156,
    breakdown: {
      5: 45,
      4: 67,
      3: 28,
      2: 12,
      1: 4
    }
  },

  // Mock reviews
  reviews: [
    {
      id: 1,
      user: "Priya Sharma",
      rating: 5,
      comment: "Absolutely love this product! My skin feels so much softer and looks radiant.",
      date: "2024-03-15",
      verified: true,
      helpful: 12
    },
    {
      id: 2,
      user: "Anjali Verma",
      rating: 4,
      comment: "Good quality product. Noticed improvement in just a few days. Highly recommend!",
      date: "2024-03-10",
      verified: true,
      helpful: 8
    },
    {
      id: 3,
      user: "Sneha Gupta",
      rating: 5,
      comment: "Amazing results! This has become my go-to product. Worth every penny.",
      date: "2024-03-05",
      verified: false,
      helpful: 15
    },
    {
      id: 4,
      user: "Riya Patel",
      rating: 3,
      comment: "Decent product but takes time to show results. Packaging could be better.",
      date: "2024-02-28",
      verified: true,
      helpful: 3
    }
  ],

  // Mock product features/benefits
  features: [
    "100% Natural Ingredients",
    "Clinically Tested",
    "Suitable for All Skin Types",
    "Cruelty-Free",
    "Paraben-Free",
    "Dermatologist Recommended"
  ],

  // Mock ingredients
  ingredients: [
    "Hyaluronic Acid",
    "Vitamin C",
    "Niacinamide",
    "Retinol",
    "Aloe Vera Extract",
    "Green Tea Extract",
    "Jojoba Oil",
    "Ceramides"
  ],

  // Mock usage instructions
  usageInstructions: [
    "Cleanse your face with a gentle cleanser",
    "Apply a small amount to damp skin",
    "Gently massage in circular motions",
    "Allow to absorb for 2-3 minutes",
    "Follow with your regular moisturizer",
    "Use twice daily for best results"
  ],

  // Mock shipping info
  shipping: {
    freeShipping: true,
    estimatedDelivery: "3-5 business days",
    returnPolicy: "30-day return policy",
    warranty: "6 months warranty"
  }
};

export default mockProductData;