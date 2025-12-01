function TimetableGrid({ timetable, selectedCourse, courseColors = {}, selectedElectives = [], readOnly = false, onSlotClick }) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = [
    { slot: 1, start: '08:00', end: '08:45' },
    { slot: 2, start: '09:00', end: '09:45' },
    { slot: 3, start: '10:00', end: '10:45' },
    { slot: 4, start: '11:00', end: '11:45' },
    { slot: 5, start: '12:00', end: '12:45' },
    { slot: 6, start: '13:00', end: '13:45' },
    { slot: 7, start: '14:00', end: '14:45' },
    { slot: 8, start: '15:00', end: '15:45' },
    { slot: 9, start: '16:00', end: '16:45' }
  ];

  const getSlotData = (day, slotNum) => {
    return timetable.find(s => s.day === day && s.slot_number === slotNum);
  };

  const getCourseColor = (slot) => {
    if (!slot || !slot.course_id) return 'bg-white';
    if (slot.slot_type === 'lunch') return 'bg-gray-200 border-gray-300';
    if (slot.slot_type === 'meeting') return 'bg-yellow-100 border-yellow-300';
    
    // Use assigned course color if available
    if (courseColors[slot.course_id]) {
      return courseColors[slot.course_id];
    }
    
    // Fallback to type-based colors
    if (slot.practical_hours > 0) return 'bg-green-100 border-green-300 text-green-800';
    if (slot.tutorial_hours > 0) return 'bg-orange-100 border-orange-300 text-orange-800';
    return 'bg-blue-100 border-blue-300 text-blue-800';
  };

  const shouldShowSlot = (slot) => {
    if (!slot || !slot.course_id) return false;
    
    // If it's an elective course, only show if selected
    if (slot.is_elective && selectedElectives.length > 0) {
      return selectedElectives.includes(slot.course_id);
    }
    
    return true;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-3 text-sm font-semibold text-gray-700 w-32">Day / Time</th>
              {timeSlots.map(slot => (
                <th key={slot.slot} className="border p-2 text-xs font-medium text-gray-600 min-w-[120px]">
                  <div>Slot {slot.slot}</div>
                  <div className="text-gray-500 font-normal">{slot.start}-{slot.end}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day}>
                <td className="border p-3 font-medium text-gray-700 bg-gray-50">
                  {day}
                </td>
                {timeSlots.map(slot => {
                  const slotData = getSlotData(day, slot.slot);
                  const isHighlighted = selectedCourse && slotData?.course_id === selectedCourse;
                  
                  const showSlot = shouldShowSlot(slotData);
                  
                  return (
                    <td
                      key={slot.slot}
                      onClick={() => !readOnly && onSlotClick && onSlotClick(day, slot.slot)}
                      className={`border p-2 text-xs ${showSlot ? getCourseColor(slotData) : 'bg-white'} ${
                        !readOnly ? 'cursor-pointer hover:opacity-80' : ''
                      } ${isHighlighted ? 'ring-2 ring-offset-1 ring-blue-500' : ''} transition-all`}
                    >
                      {showSlot && slotData?.course_code && (
                        <div className="space-y-1">
                          <div className="font-semibold">
                            {slotData.course_code}
                          </div>
                          {slotData.room_lab && (
                            <div className="text-xs opacity-80">
                              {slotData.room_lab}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TimetableGrid;
