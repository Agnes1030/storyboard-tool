# Storyboard Rules

Generated storyboard JSON must follow these consistency rules:

1. Return a single JSON object with `scene_title`, `total_shots`, and `shots`.
2. `shots` must be an ordered array of shot objects.
3. Every shot object should include `shot_num`, `shot_type`, `camera_move`, `emotion`, `characters`, `dialogue`, `visual_desc`, and `bg_atmosphere`.
4. `shot_num` must increase sequentially from 1.
5. `dialogue` should preserve the source script wording when dialogue exists.
6. `visual_desc` and `characters` should repeat stable appearance keywords so character depiction stays consistent across shots.
7. `total_shots` should match `shots.length`.

If a field has no value, use an empty string instead of omitting the key.
