<script lang="ts">
  export let min = 0;
  export let max = 50;
</script>

<div class="bg-gray-800 rounded-lg p-3">
  <div class="flex justify-between text-xs text-gray-400 mb-1">
    <span>Best ({min})</span>
    <span>Worst ({max}+)</span>
  </div>
  <div class="h-4 w-full rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 relative overflow-hidden shadow-inner border border-gray-600">
    <!-- Optional: Add ticks or markers if needed -->
  </div>
  <div class="flex justify-between text-[10px] text-gray-500 mt-1">
    <span>Global Optima</span>
    <span>Local Trap</span>
  </div>
</div>
